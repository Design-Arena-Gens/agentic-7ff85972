# Analizador Pareto para Google Sheets

Aplicación Next.js que se conecta a una hoja de Google Sheets, analiza cada fila y elabora un informe basado en el principio de Pareto (80/20) con recomendaciones priorizadas por respuesta.

## 🚀 Requisitos

- Node.js 18+
- Credenciales de servicio de Google Cloud con acceso de lectura a Google Sheets

## 🔧 Configuración

1. Duplica el archivo `.env.example` y renómbralo como `.env`.
2. Completa las variables de entorno con tus credenciales y el ID de la hoja:

   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SHEET_RANGE` (opcional, por defecto `Respuestas!A:Z`)

## 📦 Instalación & scripts

```bash
npm install
npm run dev    # Desarrollo
npm run build  # Build de producción
npm start      # Servir build
npm run lint   # Linter
```

## 🧠 Cómo funciona

- El endpoint `GET /api/analyze` lee la hoja, normaliza las respuestas (numéricas y cualitativas), pondera el impacto y determina los factores «vitales» que explican el 80 % del impacto acumulado.
- El dashboard muestra resumen ejecutivo, filas de mayor riesgo y los drivers principales por respuesta.

## 🗂️ Estructura relevante

```
app/
  page.tsx            # UI del dashboard
  api/analyze/route.ts# Endpoint con análisis
lib/
  googleSheets.ts     # Conexión a la API de Sheets
  pareto.ts           # Motor de evaluación
```

## 📤 Deploy en Vercel

El proyecto está listo para ser desplegado en Vercel. Asegúrate de definir las variables de entorno en el dashboard de Vercel o mediante la CLI antes de publicar.

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-7ff85972
```

## 📈 Ajustes adicionales

- Ajusta las ponderaciones/categorización en `lib/pareto.ts` según tus preguntas.
- Usa `GOOGLE_SHEET_RANGE` para limitar columnas/filas si tu pestaña contiene datos auxiliares.

---

Hecho con Next.js 14 y la API oficial de Google Sheets.
