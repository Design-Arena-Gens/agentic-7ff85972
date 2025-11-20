import { SheetRow } from "./googleSheets";

export interface ParetoDriver {
  question: string;
  answer: string;
  impact: number;
  share: number;
  cumulativeShare: number;
  classification: "vital" | "revisar" | "mantener";
}

export interface RowParetoReport {
  rowIndex: number;
  identifier: string;
  totalImpact: number;
  normalizedImpact: number;
  drivers: ParetoDriver[];
  recommendation: string;
  riskLevel: "alto" | "medio" | "bajo";
  raw: SheetRow;
}

export interface AggregateInsights {
  averageImpact: number;
  highestRiskRows: RowParetoReport[];
  recurrentDrivers: Array<{
    question: string;
    count: number;
  }>;
}

export interface ParetoAnalysisResult {
  reports: RowParetoReport[];
  aggregate: AggregateInsights;
}

type QuestionMetadata = {
  match: RegExp;
  weight: number;
  invert?: boolean;
};

const QUESTION_WEIGHTS: QuestionMetadata[] = [
  { match: /impacto|afecta|p\u00e9rdida/i, weight: 1.4 },
  { match: /esfuerzo|coste|costo/i, weight: 0.8, invert: true },
  { match: /frecuencia|repetici\u00f3n/i, weight: 1.2 },
  { match: /satisfacci\u00f3n|experiencia/i, weight: 1.1, invert: true },
];

const QUALITATIVE_MAP: Record<string, number> = {
  "muy alto": 1,
  "alto": 0.85,
  "medio": 0.6,
  "bajo": 0.25,
  "muy bajo": 0.1,
  "si": 0.8,
  "sí": 0.8,
  "no": 0.2,
  "critico": 1,
  "cr\u00edtico": 1,
  "relevante": 0.7,
  "neutral": 0.5,
  "irrelevante": 0.2,
};

const BASE_WEIGHT = 1;
const IMPACT_FLOOR = 0.05;

function normalizeValue(answer: string): number {
  const clean = answer.trim().toLowerCase();
  if (!clean) return 0;

  const direct = QUALITATIVE_MAP[clean];
  if (direct !== undefined) {
    return direct;
  }

  const maybeNumber = Number(clean.replace(/,/g, "."));
  if (!Number.isNaN(maybeNumber)) {
    if (maybeNumber > 10) {
      return Math.min(Math.max(maybeNumber / 100, 0), 1);
    }
    if (maybeNumber > 5) {
      return Math.min(Math.max(maybeNumber / 10, 0), 1);
    }
    return Math.min(Math.max(maybeNumber / 5, 0), 1);
  }

  if (clean.includes("alto") || clean.includes("alta")) return 0.85;
  if (clean.includes("medio")) return 0.6;
  if (clean.includes("bajo") || clean.includes("poco")) return 0.25;

  return 0.4;
}

function resolveWeight(header: string): QuestionMetadata {
  const metadata = QUESTION_WEIGHTS.find((entry) => entry.match.test(header));
  return metadata ?? { match: /.*/, weight: BASE_WEIGHT };
}

const SKIP_HEADER_PATTERNS = [
  /timestamp/i,
  /marca temporal/i,
  /correo/i,
  /email/i,
  /nombre/i,
  /^id$/i,
  /comentario/i,
  /observaci\u00f3n/i,
];

function shouldSkipHeader(header: string): boolean {
  return SKIP_HEADER_PATTERNS.some((pattern) => pattern.test(header));
}

function computeDrivers(row: SheetRow): ParetoDriver[] {
  const entries = Object.entries(row).filter(
    ([header]) => header && header.trim() && !shouldSkipHeader(header)
  );

  const scored = entries
    .map(([question, answer]) => {
      const meta = resolveWeight(question);
      const normalized = normalizeValue(answer);
      const severity = meta.invert ? 1 - normalized : normalized;
      const impact = severity * meta.weight;
      return { question, answer, impact };
    })
    .filter(({ impact }) => impact >= IMPACT_FLOOR);

  const totalImpact = scored.reduce((acc, item) => acc + item.impact, 0);
  if (totalImpact === 0) {
    return [];
  }

  const sorted = scored.sort((a, b) => b.impact - a.impact);
  let cumulative = 0;
  return sorted.map(({ question, answer, impact }) => {
    cumulative += impact;
    const share = impact / totalImpact;
    const cumulativeShare = cumulative / totalImpact;
    let classification: ParetoDriver["classification"] = "mantener";
    if (cumulativeShare <= 0.8) {
      classification = "vital";
    } else if (share >= 0.1) {
      classification = "revisar";
    }
    return {
      question,
      answer,
      impact,
      share,
      cumulativeShare,
      classification,
    };
  });
}

function determineRisk(drivers: ParetoDriver[]): "alto" | "medio" | "bajo" {
  if (drivers.length === 0) return "bajo";
  const top = drivers[0];
  if (top.share >= 0.6 || top.impact >= 0.9) return "alto";
  if (top.share >= 0.35) return "medio";
  return "bajo";
}

function buildRecommendation(drivers: ParetoDriver[]): string {
  const vitals = drivers.filter((driver) => driver.classification === "vital");
  if (vitals.length === 0) {
    return "Sin hallazgos significativos; continuar seguimiento normal.";
  }

  const targets = vitals
    .slice(0, 3)
    .map((driver) => `• ${driver.question} (respuesta: ${driver.answer || "n/a"})`);

  return `Priorizar intervenciones en: ${targets.join(" ")}`;
}

export function analyzeSheet(rows: SheetRow[]): ParetoAnalysisResult {
  const reports = rows.map((row, index) => {
    const drivers = computeDrivers(row);
    const totalImpact = drivers.reduce((acc, driver) => acc + driver.impact, 0);
    const riskLevel = determineRisk(drivers);
    const recommendation = buildRecommendation(drivers);

    const identifier = row["ID"] || row["Correo"] || row["Nombre"] || `Fila ${index + 2}`;

    return {
      rowIndex: index,
      identifier,
      totalImpact,
      normalizedImpact: totalImpact / Math.max(drivers.length, 1),
      drivers,
      recommendation,
      riskLevel,
      raw: row,
    } satisfies RowParetoReport;
  });

  const sortedByImpact = [...reports].sort((a, b) => b.totalImpact - a.totalImpact);
  const highestRiskRows = sortedByImpact.slice(0, 5);

  const driverOccurrences = new Map<string, number>();
  reports.forEach((report) => {
    report.drivers
      .filter((driver) => driver.classification === "vital")
      .forEach((driver) => {
        const current = driverOccurrences.get(driver.question) ?? 0;
        driverOccurrences.set(driver.question, current + 1);
      });
  });

  const recurrentDrivers = Array.from(driverOccurrences.entries())
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const averageImpact =
    reports.reduce((acc, report) => acc + report.totalImpact, 0) /
    Math.max(reports.length, 1);

  return {
    reports,
    aggregate: {
      averageImpact,
      highestRiskRows,
      recurrentDrivers,
    },
  };
}
