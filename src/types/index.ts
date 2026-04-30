export interface MondayUser {
  name: string;
  email: string;
  account: { name: string };
}

export interface MondayColumn {
  id: string;
  title: string;
  type: string;
}

export interface MondayBoard {
  id: string;
  name: string;
  description: string | null;
  items_count: number;
  columns: MondayColumn[];
}

export interface MondayColumnValue {
  id: string;
  text: string;
  column: { title: string; type: string };
}

export interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
}

export interface ChartData {
  name: string;
  value: number;
}

export interface AIKpi {
  name: string;
  desc: string;
  icon: string;
  insight: string;
}

export interface AIAutomation {
  name: string;
  trigger: string;
  action: string;
  priority: "גבוה" | "בינוני" | "נמוך";
}

export interface AIAnalysis {
  boardType: string;
  summary: string;
  kpis: AIKpi[];
  automations: AIAutomation[];
  insight: string;
  tags: string[];
}

export interface Session {
  apiKey: string;
  me: MondayUser;
  boards: MondayBoard[];
}
