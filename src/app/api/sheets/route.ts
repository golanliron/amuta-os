import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { sheetsUrl } = await req.json();

    if (!sheetsUrl) {
      return NextResponse.json({ error: "חסר לינק לגיליון" }, { status: 400 });
    }

    // Extract spreadsheet ID from URL
    const match = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return NextResponse.json({ error: "לינק לא תקין. ודאו שזה לינק של Google Sheets" }, { status: 400 });
    }

    const spreadsheetId = match[1];

    // Fetch as CSV (works for publicly shared sheets)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    const csvRes = await fetch(csvUrl, { redirect: "follow" });

    if (!csvRes.ok) {
      return NextResponse.json({
        error: "לא הצלחתי לגשת לגיליון. ודאו שהוא משותף עם \"Anyone with the link\"",
      }, { status: 400 });
    }

    const csvText = await csvRes.text();

    // Check if we got HTML (error page) instead of CSV
    if (csvText.trim().startsWith("<!") || csvText.trim().startsWith("<html")) {
      return NextResponse.json({
        error: "לא הצלחתי לגשת לגיליון. ודאו שהוא משותף עם \"Anyone with the link\"",
      }, { status: 400 });
    }

    // Parse CSV
    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return NextResponse.json({ error: "הגיליון ריק או מכיל שורה אחת בלבד" }, { status: 400 });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1).filter(row => row.some(cell => cell.trim() !== ""));

    // Convert to board-like structure
    const columns = headers.map((h, i) => {
      const colId = `col_${i}`;
      const values = dataRows.map(row => row[i] || "").filter(v => v.trim() !== "");
      const uniqueValues = [...new Set(values)];
      const isNumeric = values.length > 0 && values.every(v => !isNaN(Number(v.replace(/[,%₪$]/g, ""))));
      const isStatus = uniqueValues.length >= 2 && uniqueValues.length <= 15 && !isNumeric;

      return {
        id: colId,
        title: h || `עמודה ${i + 1}`,
        type: isNumeric ? "numbers" : isStatus ? "color" : "text",
      };
    });

    const items = dataRows.map((row, idx) => ({
      id: String(idx + 1),
      name: row[0] || `שורה ${idx + 1}`,
      column_values: headers.map((_, ci) => ({
        id: `col_${ci}`,
        text: row[ci] || "",
        column: columns[ci],
      })),
    }));

    const board = {
      id: spreadsheetId,
      name: `Google Sheet`,
      items_count: items.length,
      columns,
    };

    return NextResponse.json({ board, items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "שגיאה";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++; // skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current.trim());
        current = "";
      } else if (char === "\n" || (char === "\r" && next === "\n")) {
        row.push(current.trim());
        if (row.some(cell => cell !== "")) rows.push(row);
        row = [];
        current = "";
        if (char === "\r") i++; // skip \n
      } else {
        current += char;
      }
    }
  }

  // Last row
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.some(cell => cell !== "")) rows.push(row);
  }

  return rows;
}
