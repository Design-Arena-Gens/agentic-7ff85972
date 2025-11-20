"use client";

import { useEffect, useState } from "react";

interface ParetoDriver {
  question: string;
  answer: string;
  impact: number;
  share: number;
  cumulativeShare: number;
  classification: "vital" | "revisar" | "mantener";
}

interface RowParetoReport {
  rowIndex: number;
  identifier: string;
  totalImpact: number;
  normalizedImpact: number;
  drivers: ParetoDriver[];
  recommendation: string;
  riskLevel: "alto" | "medio" | "bajo";
  raw: Record<string, string>;
}

interface AggregateInsights {
  averageImpact: number;
  highestRiskRows: RowParetoReport[];
  recurrentDrivers: Array<{
    question: string;
    count: number;
  }>;
}

interface AnalysisResponse {
  metadata: {
    totalRows: number;
    generatedAt: string;
    range: string;
  };
  reports: RowParetoReport[];
  aggregate: AggregateInsights;
  error?: string;
}

export default function Home() {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze");
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Error al analizar la hoja");
      }
      const payload = (await response.json()) as AnalysisResponse;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fallo desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="grid" style={{ gap: "32px" }}>
      <header className="card" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div>
          <div className="badge">Evaluación Pareto</div>
          <h1 style={{ fontSize: "32px", margin: "12px 0 0" }}>
            Analizador de respuestas en Google Sheets
          </h1>
          <p style={{ margin: "10px 0 0", color: "rgba(226, 232, 240, 0.75)", maxWidth: "720px" }}>
            Conecta una hoja de cálculo con respuestas a preguntas fijas, evalúa el impacto de cada línea y
            destaca los factores críticos según el principio de Pareto (80/20).
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={load}
            disabled={loading}
            style={{
              background: "rgb(96, 165, 250)",
              color: "rgb(15, 23, 42)",
              border: "none",
              borderRadius: "10px",
              padding: "12px 18px",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              transition: "transform 0.2s ease",
            }}
          >
            {loading ? "Analizando..." : "Actualizar análisis"}
          </button>
          {data && (
            <span className="badge" style={{ background: "rgba(34,197,94,0.1)", color: "rgb(134,239,172)" }}>
              {`Filas analizadas: ${data.metadata.totalRows}`}
            </span>
          )}
          {data && (
            <span className="badge" style={{ background: "rgba(148,163,184,0.15)", color: "rgba(148,163,184,0.9)" }}>
              {`Rango: ${data.metadata.range}`}
            </span>
          )}
        </div>
        {error && <div style={{ color: "rgb(248, 113, 113)", fontWeight: 600 }}>{error}</div>}
        {loading && <div className="loading">Procesando datos en la nube de Google...</div>}
      </header>

      {data && (
        <section className="grid" style={{ gap: "24px" }}>
          <div className="card">
            <h2 style={{ margin: 0, fontSize: "24px" }}>Resumen ejecutivo</h2>
            <div className="grid-summary" style={{ marginTop: "20px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div className="summary-item">
                <strong>Impacto promedio</strong>
                <span style={{ fontSize: "24px", fontWeight: 700 }}>{data.aggregate.averageImpact.toFixed(2)}</span>
                <p style={{ margin: "6px 0 0", color: "rgba(148,163,184,0.75)", fontSize: "13px" }}>
                  Promedio de impacto ponderado por fila.
                </p>
              </div>
              <div className="summary-item">
                <strong>Top Pareto</strong>
                <div className="tag-list">
                  {data.aggregate.recurrentDrivers.length === 0 && (
                    <span className="tag success">Sin drivers recurrentes</span>
                  )}
                  {data.aggregate.recurrentDrivers.map((driver) => (
                    <span key={driver.question} className="tag warning">
                      {driver.question} ({driver.count})
                    </span>
                  ))}
                </div>
              </div>
              <div className="summary-item">
                <strong>Filas críticas</strong>
                <div className="tag-list">
                  {data.aggregate.highestRiskRows.length === 0 && (
                    <span className="tag success">Sin riesgos altos</span>
                  )}
                  {data.aggregate.highestRiskRows.map((row) => (
                    <span key={row.identifier} className="tag critical">
                      {row.identifier}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ margin: 0, fontSize: "24px" }}>Informe por fila</h2>
            <p style={{ margin: "8px 0 12px", color: "rgba(148,163,184,0.7)", fontSize: "14px" }}>
              Se muestran los principales factores Pareto (vitales &gt;80% del impacto) por cada respuesta.
            </p>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Identificador</th>
                    <th>Riesgo</th>
                    <th>Top drivers Pareto</th>
                    <th>Recomendación</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reports.map((report) => (
                    <tr key={report.identifier}>
                      <td style={{ fontWeight: 600 }}>{report.identifier}</td>
                      <td>
                        <span
                          className={`summary-badge ${
                            report.riskLevel === "alto"
                              ? ""
                              : report.riskLevel === "medio"
                              ? "warning"
                              : "good"
                          }`}
                        >
                          {report.riskLevel.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="tag-list">
                          {report.drivers.length === 0 && <span className="tag success">Sin datos</span>}
                          {report.drivers.slice(0, 3).map((driver) => (
                            <span key={driver.question} className={
                              driver.classification === "vital"
                                ? "tag critical"
                                : driver.classification === "revisar"
                                ? "tag warning"
                                : "tag"
                            }>
                              {driver.question} · {formatPercent(driver.share)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ maxWidth: "380px" }}>{report.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
