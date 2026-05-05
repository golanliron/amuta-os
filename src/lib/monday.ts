// Monday.com client - calls our proxy API which uses the user's OAuth token

export interface MondayBoard {
  id: string;
  name: string;
  state: string;
  board_kind: string;
  items_count: number;
}

export interface MondayConnectionStatus {
  connected: boolean;
  monday_user_name?: string;
  monday_account_id?: string;
  connected_at?: string;
}

export async function getMondayStatus(): Promise<MondayConnectionStatus> {
  const res = await fetch('/api/monday');
  return res.json();
}

export async function mondayQuery<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/monday', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const data = await res.json();

  if (data.error && data.code === 'MONDAY_NOT_CONNECTED') {
    throw new Error('MONDAY_NOT_CONNECTED');
  }

  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Monday API error');
  }

  return data.data as T;
}

export async function listBoards(): Promise<MondayBoard[]> {
  const data = await mondayQuery<{ boards: MondayBoard[] }>(
    `{ boards(limit: 50) { id name state board_kind items_count } }`
  );
  return data.boards;
}

export async function disconnectMonday(): Promise<void> {
  await fetch('/api/monday', { method: 'DELETE' });
}
