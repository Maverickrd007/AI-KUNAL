# AstraML

AstraML is a data science copilot web app: upload a dataset, inspect a fingerprint, clean it, train models with live progress, explain the winner, chat with Astra, compare experiments, and generate PDF reports.

## Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Zustand, Recharts
- Backend: Node.js 20, Express, TypeScript, Multer, ws, better-sqlite3, pdfkit
- ML service: FastAPI, pandas, scikit-learn, SHAP TreeExplainer, Pydantic v2
- AI: Groq `llama-3.3-70b-versatile` for chat/verdicts and Gemini 1.5 Flash for reports

## Setup

1. Copy environment values:

```bash
cp .env.example .env
```

2. Fill in `GROQ_API_KEY` and `GEMINI_API_KEY` in `.env`. The app still runs without keys, using deterministic local summaries, but AI narrative quality is better with keys.

3. Install dependencies:

```bash
cd frontend && npm install
cd ../backend && npm install
cd ../ml-service && python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
```

4. Start the services in three terminals:

```bash
cd ml-service
uvicorn app.main:app --reload --port 8000
```

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## Docker

```bash
docker compose up --build
```

For production deployment, use the hardened Compose file:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

See `DEPLOY.md` for VPS/domain/volume instructions.

## Sample Data

Use `sample_data/churn.csv` to test the full flow. It has 1,000 rows, a binary `churned` target with a 78/22 split, 47 missing values, 3 outliers, an ID-like `customer_id`, and a high-correlation `total_charges` leakage candidate.

## Verification Path

1. Upload `sample_data/churn.csv`.
2. Confirm the Dataset Fingerprint renders, with leakage warnings for `customer_id` and `total_charges`.
3. Apply cleaning and review the animated pipeline steps.
4. Train all five algorithms and watch live WebSocket progress.
5. Review Astra Verdict and the metrics dashboard.
6. Open Explain, adjust `tenure_months` in the what-if simulator, and inspect feature importance.
7. Ask chat: `why did random forest win?` or `try gradient boosting`.
8. Compare two experiments in Experiments.
9. Generate a PDF report from Dashboard or Explain.

## Notes

- Uploaded files are stored in `backend/uploads` and ignored by Git.
- SQLite data is stored at `backend/db/astraml.db` by default.
- No API keys are hardcoded in source files.
