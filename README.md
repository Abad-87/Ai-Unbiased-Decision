<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=10b981&height=220&section=header&text=Unbiased%20AI&fontSize=52&fontColor=ffffff&fontAlignY=38&desc=Detect%20%C2%B7%20Explain%20%C2%B7%20Mitigate%20%C2%B7%20Deploy%20with%20Confidence&descAlignY=58&descSize=17"/>

<br/>

```
██╗   ██╗███╗   ██╗██████╗ ██╗ █████╗ ███████╗███████╗██████╗      █████╗ ██╗
██║   ██║████╗  ██║██╔══██╗██║██╔══██╗██╔════╝██╔════╝██╔══██╗    ██╔══██╗██║
██║   ██║██╔██╗ ██║██████╔╝██║███████║███████╗█████╗  ██║  ██║    ███████║██║
██║   ██║██║╚██╗██║██╔══██╗██║██╔══██║╚════██║██╔══╝  ██║  ██║    ██╔══██║██║
╚██████╔╝██║ ╚████║██████╔╝██║██║  ██║███████║███████╗██████╔╝    ██║  ██║██║
 ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═════╝     ╚═╝  ╚═╝╚═╝
```

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=18&duration=2000&pause=1200&color=10B981&center=true&vCenter=true&width=720&lines=Detect+bias.+Explain+decisions.+Enforce+fairness.+Deploy+with+confidence." alt="Tagline" />

<br/>

![Python](https://img.shields.io/badge/Python-3.11-10b981?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-19-10b981?style=for-the-badge&logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-10b981?style=for-the-badge&logo=fastapi&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-10b981?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-10b981?style=for-the-badge&logo=tailwindcss&logoColor=white)

<br/>

[![Live Demo](https://img.shields.io/badge/⚡_Live_Demo-Visit_Now-059669?style=for-the-badge)](https://your-demo.netlify.app)
&nbsp;
[![API Docs](https://img.shields.io/badge/📡_API_Docs-Swagger_UI-047857?style=for-the-badge)](https://your-backend.onrender.com/docs)
&nbsp;
[![License](https://img.shields.io/badge/License-MIT-065f46?style=for-the-badge)](LICENSE)

<br/><br/>

> **Hiring tools that favor one gender. Loan models that redline zip codes.**
> **Recommendation engines that filter entire demographics.**
>
> Bias in AI is real — and most teams never see it until it's too late.
> **Unbiased AI makes invisible bias visible, measurable, and fixable.**

<br/>

---

</div>

<br/>

## ✦ What We Built

A production-grade fairness monitoring platform with three trained ML models, a real-time bias analytics engine, interactive what-if tooling, and an automated mitigation pipeline — all in a single deployable full-stack app.

<br/>

<table>
<tr>
<td width="50%" valign="top">

### 🎯 &nbsp;Bias Detection Engine

Real-time fairness scan across three live AI domains. Calculates Demographic Parity Difference, Equal Opportunity Difference, and Disparate Impact Ratio per protected group. Configurable thresholds. One-click full scan. Parity gap table with red/green indicators and domain switching.

</td>
<td width="50%" valign="top">

### ⚡ &nbsp;What-If Fairness Explorer

Adjust any model feature with live sliders — credit score, education level, session time — and get instant predictions with SHAP feature importance charts. Every prediction logs a correlation ID for full auditability and ground-truth annotation.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🛡️ &nbsp;Mitigation Lab

Three post-processing algorithms: threshold optimization, calibration adjustment, and disparate impact removal. Side-by-side before/after bar charts. Live fairness score delta and affected record count. Real API — no mock data.

</td>
<td width="50%" valign="top">

### 📊 &nbsp;Live Audit Reports

Fairness snapshots across all three domains. Full prediction history with confidence scores, bias risk bands, and ground-truth annotation loop. One-click JSON export for regulatory submissions. Built for auditors.

</td>
</tr>
</table>

<br/>

---

<br/>

## ✦ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         BROWSER                              │
│   React 19  ·  TypeScript 6  ·  Tailwind v4  ·  Recharts    │
│                                                              │
│   Dashboard · Bias Detection · Fairness Explorer             │
│   Mitigation Lab · Audit Reports · File Manager              │
└─────────────────────────┬────────────────────────────────────┘
                          │  REST / JSON
                          │  (VITE_API_BASE_URL)
┌─────────────────────────▼────────────────────────────────────┐
│                      FASTAPI BACKEND                         │
│                      Python 3.11                             │
│                                                              │
│   POST  /hiring/predict        POST  /loan/predict           │
│   POST  /social/recommend      POST  /mitigation/apply       │
│   GET   /insights/:domain      POST  /feedback               │
│   GET/POST  /files/*           GET   /shap/:id               │
└──────────────────────┬───────────────────────────────────────┘
                       │
          ┌────────────┴─────────────┐
          │                          │
┌─────────▼──────────┐    ┌──────────▼──────────┐
│   MongoDB Atlas    │ OR │   JSON Fallback      │
│  (predictions +    │    │  (zero-config dev)   │
│   feedback store)  │    └─────────────────────┘
└─────────┬──────────┘
          │
┌─────────▼──────────┐
│  scikit-learn      │
│  hiring_model.pkl  │
│  loan_model.pkl    │
│  social_model.pkl  │
└────────────────────┘
```

<br/>

---

<br/>

## ✦ Fairness Metrics

| Metric | What it measures | Threshold |
|--------|-----------------|-----------|
| **Demographic Parity Difference** | Gap in positive-decision rates between groups | `< 0.10` ideal |
| **Equal Opportunity Difference** | Gap in true-positive rates for qualified individuals | `< 0.10` ideal |
| **Disparate Impact Ratio** | Minority positive rate ÷ majority positive rate | `≥ 0.80` (legal rule) |
| **Bias Risk Score** | Composite 0–100 internal risk band | `< 40` = low risk |

When violations are detected the system flags predictions for human review, logs the event, and surfaces a mitigation recommendation automatically.

<br/>

---

<br/>

## ✦ Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Python | ≥ 3.11 |
| Node.js | ≥ 20 |
| npm | ≥ 10 |

<br/>

**1 — Clone and bootstrap**

```bash
git clone https://github.com/your-username/unbiased-ai.git
cd unbiased-ai

# Build placeholder ML models (required before first run)
python create_dummy_models.py
```

**2 — Start the backend**

```bash
cd backend
pip install -r requirements.txt

# MONGO_URL is optional — leave blank to use local JSON fallback
cp ../.env.example .env

uvicorn main:app --reload --port 8000
# Swagger UI → http://localhost:8000/docs
```

**3 — Start the frontend**

```bash
cd frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
npm run dev
# App → http://localhost:5173
```

<br/>

---

<br/>

## ✦ Configuration

### Backend &nbsp;`.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URL` | *(blank)* | MongoDB Atlas URI — leave empty for JSON fallback |
| `ENVIRONMENT` | `development` | `development` or `production` |
| `FRONTEND_ORIGINS` | `http://localhost:5173` | CORS allowed origins |
| `HIRING_POSITIVE_THRESHOLD` | `0.55` | Approve if confidence ≥ this |
| `HIRING_NEGATIVE_THRESHOLD` | `0.45` | Reject if confidence ≤ this |
| `LOAN_POSITIVE_THRESHOLD` | `0.55` | Same logic for loan domain |
| `LOAN_NEGATIVE_THRESHOLD` | `0.45` | Same logic for loan domain |

### Frontend &nbsp;`.env.local`

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend base URL |

<br/>

---

<br/>

## ✦ API Reference

<details>
<summary><strong>POST &nbsp;/hiring/predict</strong></summary>

<br/>

```json
// Request
{
  "years_experience": 5,
  "education_level": 2,
  "technical_score": 80,
  "communication_score": 75,
  "num_past_jobs": 3,
  "certifications": 2,
  "gender": "female",
  "ethnicity": "asian"
}

// Response
{
  "prediction": 1,
  "prediction_label": "Hired",
  "confidence": 0.847,
  "bias_risk": {
    "score": 0.12,
    "band": "low",
    "flag_for_review": false,
    "recommendation": "Decision within acceptable fairness bounds."
  },
  "correlation_id": "hire_a1b2c3",
  "shap_poll_url": "/shap/hire_a1b2c3"
}
```

</details>

<details>
<summary><strong>POST &nbsp;/loan/predict</strong></summary>

<br/>

```json
// Request
{
  "credit_score": 720,
  "annual_income": 75000,
  "loan_amount": 25000,
  "loan_term_months": 36,
  "employment_years": 5,
  "gender": "male",
  "age_group": "26-40"
}

// Response
{
  "prediction": 1,
  "prediction_label": "Approved",
  "confidence": 0.913,
  "bias_risk": { "score": 0.08, "band": "low", "flag_for_review": false },
  "correlation_id": "loan_x9y8z7"
}
```

</details>

<details>
<summary><strong>GET &nbsp;/insights/:domain/summary</strong></summary>

<br/>

```json
{
  "domain": "hiring",
  "n_records": 342,
  "labelled_count": 89,
  "sensitive_attributes_detected": ["gender", "ethnicity"],
  "demographic_parity_difference": 0.14,
  "equal_opportunity_difference": 0.09,
  "per_group": [
    { "group": "male",   "n": 180, "positive_rate": 0.76, "avg_confidence": 0.81 },
    { "group": "female", "n": 162, "positive_rate": 0.62, "avg_confidence": 0.77 }
  ]
}
```

</details>

<details>
<summary><strong>POST &nbsp;/mitigation/apply</strong></summary>

<br/>

```json
// Request
{
  "domain": "hiring",
  "method": "threshold",
  "strength": 0.7,
  "target_metric": "demographic_parity"
}

// Response
{
  "success": true,
  "original_dpd": 0.14,
  "mitigated_dpd": 0.05,
  "improvement_pct": 64.3,
  "affected_records": 28,
  "new_thresholds": [
    { "group": "female", "original_threshold": 0.50, "new_threshold": 0.42 }
  ]
}
```

</details>

<details>
<summary><strong>POST &nbsp;/feedback — ground-truth annotation</strong></summary>

<br/>

```json
// Request
{ "correlation_id": "hire_a1b2c3", "ground_truth": 1 }

// Response
{ "correlation_id": "hire_a1b2c3", "updated": true, "message": "Ground truth recorded." }
```

Annotates a past prediction with its real-world outcome, enabling Equalized Odds and Calibration metric calculations.

</details>

<br/>

---

<br/>

## ✦ Project Structure

```
unbiased-ai/
│
├── backend/
│   ├── main.py                      ← FastAPI app + router wiring
│   ├── models/                      ← Trained .pkl model files
│   ├── hiring/router.py             ← POST /hiring/predict
│   ├── loan/router.py               ← POST /loan/predict
│   ├── social/router.py             ← POST /social/recommend
│   ├── fairness/checker.py          ← DPD, EOD, disparate impact
│   └── utils/
│       ├── database.py              ← MongoDB + JSON fallback
│       ├── insights_router.py       ← GET  /insights/*
│       ├── mitigation_router.py     ← POST /mitigation/*
│       ├── feedback_router.py       ← POST /feedback
│       └── file_upload_router.py    ← GET/POST /files/*
│
├── frontend/src/
│   ├── features/
│   │   ├── dashboard/               ← Live fairness overview
│   │   ├── bias-detection/          ← Scan & metrics table
│   │   ├── fairness-explorer/       ← What-If analysis + SHAP
│   │   ├── mitigation-lab/          ← Before/After comparison
│   │   ├── reports/                 ← Audit log + JSON export
│   │   ├── datasets/                ← File manager
│   │   ├── hiring-prediction/       ← Hiring domain UI
│   │   └── social-recommendation/  ← Social domain UI
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── TopNavbar.tsx
│   │   └── FeedbackForm.tsx
│   └── lib/api.ts                   ← Fully-typed REST client
│
├── data/
│   ├── hiring_test_data.csv
│   ├── loan_test_data.csv
│   └── social_test_data.csv
│
├── create_dummy_models.py           ← Bootstrap ML models for dev
├── test_system.py                   ← Full system verification suite
├── render.yaml                      ← One-click Render deploy config
└── netlify.toml                     ← One-click Netlify deploy config
```

<br/>

---

<br/>

## ✦ Testing

```bash
# Generate models first (required)
python create_dummy_models.py

# Backend unit tests
cd backend && python -m pytest -q

# Full system verification — imports, types, routers, components
python test_system.py
```

CI runs on every push via GitHub Actions — see `.github/workflows/backend-ci.yml`.

<br/>

---

<br/>

## ✦ One-Click Deployment

**Backend → [Render](https://render.com)**

```
1. New Web Service → connect GitHub repo
2. Render auto-reads render.yaml — no manual config needed
3. Add env var:  MONGO_URL  (MongoDB Atlas → Connect → Drivers)
4. Deploy — copy your public URL
```

**Frontend → [Netlify](https://netlify.com)**

```
1. New Site → Import from Git → connect repo
2. Netlify auto-reads netlify.toml — no manual config needed
3. Add env var:  VITE_API_BASE_URL=https://your-render-url.onrender.com
4. Deploy
```

<br/>

---

<br/>

## ✦ Roadmap

- [x] Multi-domain bias detection — Hiring · Loan · Social
- [x] SHAP feature importance explanations
- [x] Live mitigation with configurable strength and before/after view
- [x] Ground-truth feedback annotation loop
- [x] Universal file manager — CSV, PDF, images, JSON, archives
- [x] MongoDB + zero-config JSON fallback
- [x] Dark mode + collapsible sidebar
- [ ] Custom dataset upload → auto-train pipeline
- [ ] PDF audit report generation
- [ ] Slack / webhook alerts on threshold breach
- [ ] Multi-model comparison view
- [ ] Role-based access control — auditor · analyst · admin

<br/>

---

<br/>

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=15&duration=4000&pause=2000&color=10B981&center=true&vCenter=true&width=640&lines=Built+to+make+AI+fair%2C+explainable%2C+and+auditable+for+everyone." alt="Footer tagline" />

<br/><br/>

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white)](https://netlify.com)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://render.com)

<br/><br/>

*"Fairness is not a feature — it is a responsibility."*

<br/>

**⭐ &nbsp;Star this repo if you believe AI should work equally for everyone.**

<br/>

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=10b981&height=120&section=footer"/>

</div>
