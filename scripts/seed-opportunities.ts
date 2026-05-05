import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://touqczopfjxcpmbxzdjr.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Read grants data
const grantsPath = resolve('C:/Users/golan/OneDrive/Desktop/hopa/data/grants_database.json');
const raw = readFileSync(grantsPath, 'utf-8');
const data = JSON.parse(raw);
const items = data.items || data.grants || [];

console.log(`Loading ${items.length} grants...`);

interface GrantItem {
  title: string;
  description?: string;
  source?: string;
  deadline?: string;
  funder?: string;
  url?: string;
  type?: string;
  categories?: string[];
  target_populations?: string[];
  tags?: string[];
  status?: string;
  eligible?: string[];
  amount?: number;
}

// Transform to opportunities schema
const rows = items.map((item: GrantItem) => ({
  source: item.source || 'atlas',
  title: item.title?.slice(0, 300),
  description: item.description?.slice(0, 1000) || null,
  amount_min: typeof item.amount === 'number' ? item.amount : null,
  amount_max: typeof item.amount === 'number' ? item.amount : null,
  deadline: item.deadline || null,
  categories: item.categories || [],
  regions: [],
  target_populations: item.target_populations || [],
  tags: item.tags || [],
  type: item.type || 'kok',
  funder: item.funder || null,
  url: item.url || null,
  eligibility: item.eligible?.join(', ') || null,
  active: item.status === 'open',
}));

// Insert in batches of 50
async function run() {
  let inserted = 0;
  const batchSize = 50;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from('opportunities').insert(batch);
    if (error) {
      console.error(`Batch ${i / batchSize} error:`, error.message);
      // Try one by one
      for (const row of batch) {
        const { error: singleError } = await supabase.from('opportunities').insert(row);
        if (!singleError) inserted++;
        else console.error(`  Failed: ${row.title?.slice(0, 50)} - ${singleError.message}`);
      }
    } else {
      inserted += batch.length;
      console.log(`Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} inserted (total: ${inserted})`);
    }
  }

  // Verify
  const { count } = await supabase.from('opportunities').select('*', { count: 'exact', head: true });
  console.log(`\nDone! Total in DB: ${count}`);
}

run().catch(console.error);
