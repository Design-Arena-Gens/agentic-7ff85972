import { NextResponse } from "next/server";
import { analyzeSheet } from "../../../lib/pareto";
import { fetchSheetRows } from "../../../lib/googleSheets";

const DEFAULT_RANGE = process.env.GOOGLE_SHEET_RANGE || "Respuestas!A:Z";

export async function GET() {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      return NextResponse.json(
        { error: "Falta GOOGLE_SHEET_ID en variables de entorno." },
        { status: 500 }
      );
    }

    const rows = await fetchSheetRows({
      spreadsheetId: sheetId,
      range: DEFAULT_RANGE,
    });

    const { reports, aggregate } = analyzeSheet(rows);

    return NextResponse.json({
      metadata: {
        totalRows: reports.length,
        generatedAt: new Date().toISOString(),
        range: DEFAULT_RANGE,
      },
      reports,
      aggregate,
    });
  } catch (error) {
    console.error("Error en /api/analyze", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Error desconocido",
    }, {
      status: 500,
    });
  }
}
