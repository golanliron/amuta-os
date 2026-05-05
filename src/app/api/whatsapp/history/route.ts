import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get('phone');
  if (!phone) {
    return Response.json({ error: 'Missing phone' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: messages } = await supabase
    .from('whatsapp_messages')
    .select('role, content, created_at')
    .eq('phone', phone.replace(/\D/g, ''))
    .order('created_at', { ascending: true })
    .limit(50);

  return Response.json({ messages: messages || [] });
}
