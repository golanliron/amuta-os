-- Monday.com OAuth tokens per user
CREATE TABLE IF NOT EXISTS monday_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  monday_user_id text,
  monday_account_id text,
  monday_user_name text,
  connected_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS: users can only see their own token
ALTER TABLE monday_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monday token"
  ON monday_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monday token"
  ON monday_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monday token"
  ON monday_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own monday token"
  ON monday_tokens FOR DELETE
  USING (auth.uid() = user_id);
