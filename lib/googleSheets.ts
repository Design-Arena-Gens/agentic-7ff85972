import { google } from "googleapis";

export type SheetRow = Record<string, string>;

export interface SheetFetchOptions {
  spreadsheetId: string;
  range: string;
}

export async function fetchSheetRows({
  spreadsheetId,
  range,
}: SheetFetchOptions): Promise<SheetRow[]> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Faltan credenciales de Google. Define GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY."
    );
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  return dataRows.map((row) => {
    const entry: SheetRow = {};
    headerRow.forEach((header, index) => {
      entry[header.trim()] = row[index] ?? "";
    });
    return entry;
  });
}
