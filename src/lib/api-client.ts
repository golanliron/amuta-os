import type { MondayBoard, MondayItem, AIAnalysis } from "@/types";

export async function loadBoard(boardId: string, apiToken: string): Promise<{
  board: MondayBoard;
  items: MondayItem[];
}> {
  const res = await fetch("/api/monday", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "board", boardId, apiToken }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function analyzeBoardAI(
  boardName: string,
  itemsCount: number,
  columns: string,
  statusDistribution: string
): Promise<AIAnalysis> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardName, itemsCount, columns, statusDistribution }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}
