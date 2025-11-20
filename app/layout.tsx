import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Analizador Pareto de Google Sheets",
  description:
    "Analiza respuestas almacenadas en Google Sheets aplicando evaluación Pareto por fila.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        <main className="max-w-6xl mx-auto px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
