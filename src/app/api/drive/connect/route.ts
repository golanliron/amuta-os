import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function extractFolderId(url: string): string | null {
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { org_id, drive_url } = await request.json();

    if (!org_id || !drive_url) {
      return Response.json({ error: 'Missing org_id or drive_url' }, { status: 400 });
    }

    const folderId = extractFolderId(drive_url);
    if (!folderId) {
      return Response.json({
        error: 'לא הצלחתי לזהות תיקיית Drive. ודאו שהקישור תקין.',
      }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Save Drive link in org_profiles (always works)
    const { data: existing } = await supabase
      .from('org_profiles')
      .select('data')
      .eq('org_id', org_id)
      .single();

    const current = (existing?.data as Record<string, unknown>) || {};
    current.drive_folder_id = folderId;
    current.drive_url = drive_url;
    current.drive_connected_at = new Date().toISOString();

    await supabase.from('org_profiles').upsert({
      org_id,
      data: current,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'org_id' });

    // Also save in organizations table if exists
    try {
      await supabase
        .from('organizations')
        .update({
          settings: {
            drive_folder_id: folderId,
            drive_url,
            drive_connected_at: new Date().toISOString(),
          },
        })
        .eq('id', org_id);
    } catch {
      // OK if organizations table doesn't have this row
    }

    // Save as document reference for RAG context
    await supabase.from('documents').insert({
      org_id,
      filename: 'Google Drive - תיקייה משותפת',
      file_type: 'link',
      storage_path: `drive://${folderId}`,
      category: 'other',
      parsed_text: `קישור Google Drive: ${drive_url}\nFolder ID: ${folderId}\nוודאו שהתיקייה משותפת כדי שGoldfish יוכל לגשת.`,
      metadata: { drive_folder_id: folderId, drive_url, type: 'drive_link' },
      status: 'ready',
    });

    // Try to list files if we have Google API key
    const apiKey = process.env.GOOGLE_API_KEY;
    let filesImported = 0;

    if (apiKey) {
      try {
        const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name,mimeType)&pageSize=20`;
        const res = await fetch(listUrl);

        if (res.ok) {
          const data = await res.json();
          for (const file of (data.files || [])) {
            await supabase.from('documents').insert({
              org_id,
              filename: file.name,
              file_type: file.mimeType?.includes('pdf') ? 'pdf' :
                         file.mimeType?.includes('document') ? 'docx' :
                         file.mimeType?.includes('spreadsheet') ? 'xlsx' : 'other',
              storage_path: `drive://${file.id}`,
              category: 'other',
              parsed_text: `[קובץ מ-Drive: ${file.name}]`,
              metadata: { drive_file_id: file.id, drive_url, mime_type: file.mimeType },
              status: 'processing',
            });
            filesImported++;
          }
        }
      } catch (e) {
        console.error('Drive API error:', e);
      }
    }

    return Response.json({
      connected: true,
      folder_id: folderId,
      files_found: filesImported,
      message: filesImported > 0
        ? `נמצאו ${filesImported} קבצים. Goldfish מעבד.`
        : 'קישור Drive נשמר. ודאו שהתיקייה משותפת (Anyone with the link).',
    });
  } catch (error) {
    console.error('Drive connect error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
