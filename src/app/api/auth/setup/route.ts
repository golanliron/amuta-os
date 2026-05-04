import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { user_id, email, org_name } = await request.json();

    if (!user_id || !email || !org_name) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: org_name })
      .select('id')
      .single();

    if (orgError || !org) {
      return Response.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    // Create user record linked to org
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: user_id,
        org_id: org.id,
        email,
        role: 'admin',
      });

    if (userError) {
      return Response.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Create empty org profile
    await supabase
      .from('org_profiles')
      .insert({
        org_id: org.id,
        data: { name: org_name },
      });

    return Response.json({ org_id: org.id });
  } catch (error) {
    console.error('Auth setup error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
