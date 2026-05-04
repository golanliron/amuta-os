import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Classify document category using Claude
async function classifyDocument(text: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-3-5-20241022',
    system: `Classify this document into exactly ONE category:
- identity: charter, registration, organizational description
- budget: financial reports, balance sheets, budget plans
- project: project descriptions, work plans, activity reports
- grant: existing grant agreements, funding letters
- submission: past grant submissions/proposals
- other: anything else

Reply with ONLY the category name, nothing else.`,
    messages: [{ role: 'user', content: text.slice(0, 3000) }],
    max_tokens: 20,
  });

  const category = (res.content[0].type === 'text' ? res.content[0].text : '')
    .trim().toLowerCase();
  const valid = ['identity', 'budget', 'project', 'grant', 'submission', 'other'];
  return valid.includes(category) ? category : 'other';
}

// Extract structured data from document using Claude
async function extractStructuredData(text: string, category: string): Promise<Record<string, unknown>> {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-3-5-20241022',
    system: `Extract structured data from this ${category} document. Return valid JSON with relevant fields.
For identity: name, registration_number, founded_year, mission, focus_areas
For budget: annual_budget, revenue_sources, expenses_breakdown
For project: project_name, description, budget, beneficiaries, region
For grant: source, amount, period, conditions
For submission: target_fund, amount_requested, project_name, status
Extract what's available. Hebrew text is fine. Return ONLY valid JSON.`,
    messages: [{ role: 'user', content: text.slice(0, 4000) }],
    max_tokens: 1000,
  });

  try {
    const content = res.content[0].type === 'text' ? res.content[0].text : '{}';
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// Chunk text into ~500 token segments
function chunkText(text: string, maxChars: number = 2000): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + para).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text.slice(0, maxChars)];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const orgId = formData.get('org_id') as string;

    if (!file || !orgId) {
      return Response.json({ error: 'Missing file or org_id' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Upload file to storage
    const storagePath = `${orgId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file);

    if (uploadError) {
      return Response.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Determine file type
    const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
    const fileTypeMap: Record<string, string> = {
      pdf: 'pdf', docx: 'docx', doc: 'docx',
      xlsx: 'xlsx', xls: 'xlsx', txt: 'txt',
    };
    const fileType = fileTypeMap[ext] || 'txt';

    // Parse text from file
    let parsedText = '';
    if (fileType === 'txt' || ext === 'md') {
      parsedText = await file.text();
    } else {
      parsedText = `[${fileType} file: ${file.name}]`;
    }

    // Classify document
    const category = parsedText.length > 50
      ? await classifyDocument(parsedText)
      : 'other';

    // Extract structured data
    const metadata = parsedText.length > 50
      ? await extractStructuredData(parsedText, category)
      : {};

    // Save document record
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        org_id: orgId,
        filename: file.name,
        file_type: fileType,
        storage_path: storagePath,
        category,
        parsed_text: parsedText,
        metadata,
        status: 'ready',
      })
      .select('id')
      .single();

    if (docError || !doc) {
      return Response.json({ error: 'Failed to save document' }, { status: 500 });
    }

    // Store chunks for text-based RAG (no embeddings needed with Claude)
    if (parsedText.length > 50) {
      const chunks = chunkText(parsedText);

      for (const chunkContent of chunks) {
        await supabase.from('document_chunks').insert({
          document_id: doc.id,
          org_id: orgId,
          content: chunkContent,
          metadata: { category, filename: file.name },
        });
      }

      // Update org profile with extracted data
      await updateOrgProfile(supabase, orgId, category, metadata);
    }

    return Response.json({
      document_id: doc.id,
      category,
      extracted_fields: metadata,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function updateOrgProfile(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  category: string,
  newData: Record<string, unknown>
) {
  const { data: existing } = await supabase
    .from('org_profiles')
    .select('data')
    .eq('org_id', orgId)
    .single();

  const currentData = (existing?.data as Record<string, unknown>) || {};
  const mergedData = { ...currentData };

  if (category === 'identity') {
    Object.assign(mergedData, {
      name: newData.name || mergedData.name,
      registration_number: newData.registration_number || mergedData.registration_number,
      founded_year: newData.founded_year || mergedData.founded_year,
      mission: newData.mission || mergedData.mission,
      focus_areas: newData.focus_areas || mergedData.focus_areas,
    });
  } else if (category === 'budget') {
    Object.assign(mergedData, {
      annual_budget: newData.annual_budget || mergedData.annual_budget,
    });
  } else if (category === 'project') {
    const projects = (mergedData.active_projects as unknown[]) || [];
    projects.push(newData);
    mergedData.active_projects = projects;
  } else if (category === 'grant') {
    const grants = (mergedData.existing_grants as unknown[]) || [];
    grants.push(newData);
    mergedData.existing_grants = grants;
  }

  await supabase.from('org_profiles').upsert({
    org_id: orgId,
    data: mergedData,
    last_updated: new Date().toISOString(),
  }, { onConflict: 'org_id' });
}
