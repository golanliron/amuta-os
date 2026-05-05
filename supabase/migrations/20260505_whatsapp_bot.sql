-- WhatsApp bot tables for Fishgold

-- Users registered via WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text,
  org_id uuid REFERENCES organizations(id),
  user_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now()
);

-- Conversation history
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  org_id uuid REFERENCES organizations(id),
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wa_users_phone ON whatsapp_users(phone);
CREATE INDEX IF NOT EXISTS idx_wa_users_org ON whatsapp_users(org_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_phone ON whatsapp_messages(phone);
CREATE INDEX IF NOT EXISTS idx_wa_messages_org ON whatsapp_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_created ON whatsapp_messages(created_at DESC);

-- RLS
ALTER TABLE whatsapp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (webhook uses admin client)
CREATE POLICY "Service role full access" ON whatsapp_users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON whatsapp_messages
  FOR ALL USING (true) WITH CHECK (true);
