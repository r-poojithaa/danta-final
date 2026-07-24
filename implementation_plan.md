# Danta — Multimodal Bayesian Clinical Decision Support PWA

## Overview

Full-stack Progressive Web Application for dental dry socket risk prediction. Combines a **Bayesian Network** (clinical risk factors) with **OpenAI GPT-4o Vision** (image analysis of intraoral photos) to deliver a real-time, interpretable risk score.

---

## Architecture

```
Frontend (React + Vite + Tailwind)
    ↓
Bayesian Network Engine (JS, client-side)
    + OpenAI GPT-4o Vision (image → clinical features)
    ↓
Supabase (Auth + PostgreSQL + Storage + Realtime)
    ↓
IndexedDB / Service Worker (Offline PWA)
```

---

## ML / AI Design

### 1. Bayesian Network (Dry Socket Risk)

Trained with **evidence-based clinical prior probabilities** from published literature (Nusair & Younis 2007, Blum 1992, Birn 1973). The network models conditional dependencies between:

| Node | Type | Key Evidence |
|------|------|-------------|
| Smoking | Prior | OR ~4.5× dry socket risk |
| Gender + OCP | Prior | Females on OCP: OR ~2× |
| Extraction site | Prior | Mandibular > maxillary |
| Impaction | Prior | Impacted wisdom teeth: OR ~5× |
| Extraction trauma | Prior | Difficult extraction: OR ~3× |
| Oral hygiene | Prior | Poor hygiene: OR ~2× |
| Previous dry socket | Prior | History: OR ~10× |
| Diabetes | Prior | OR ~1.8× |
| Anticoagulants/NSAIDs | Prior | Impairs clot formation |
| Age | Prior | 20-40 yr peak |

**Network structure:**
```
Smoking ──────────────┐
Gender + OCP ─────────┤
Extraction site ──────┤→ [Dry Socket Risk Node] → P(DrySocket | evidence)
Impaction ────────────┤
Trauma ───────────────┤
Prior history ────────┤
Oral hygiene ─────────┘
```

Uses **Variable Elimination** with Noisy-OR gate to combine evidence.

### 2. Image Analysis (CNN proxy via GPT-4o Vision)

GPT-4o Vision analyzes the intraoral image and returns structured JSON:
```json
{
  "clot_present": false,
  "bone_exposure": true,
  "inflammation": "moderate",
  "debris": true,
  "confidence": 0.87,
  "clinical_notes": "..."
}
```

These image features are converted to probability adjustments fed back into the Bayesian Network.

### 3. Combined Risk Score

```
FinalRisk = w₁ × BayesianScore + w₂ × ImageScore
          = 0.60 × BN_probability + 0.40 × Image_probability
```

---

## Proposed Changes

### Project Bootstrap

#### [NEW] Vite + React + Tailwind app at `d:/pdd/`

---

### Core Services (`src/services/`)

#### [NEW] `bayesianNetwork.js`
- Full Bayesian Network class with CPTs (Conditional Probability Tables)
- Pre-trained with clinical prior probabilities from literature
- `computeRisk(evidence)` → returns `{ probability, riskLevel, contributingFactors }`

#### [NEW] `imageAnalysis.js`
- Sends base64 image to OpenAI GPT-4o Vision
- Returns structured clinical feature JSON
- Converts features to probability inputs for BN

#### [NEW] `riskCalculator.js`
- Fuses BN score + image analysis score
- Returns unified `DrySocketRiskResult`

#### [NEW] `supabase.js`
- Supabase client config
- Auth helpers, patient CRUD, image storage

#### [NEW] `offline.js`
- IndexedDB wrapper for offline patient data
- Sync queue management

---

### Pages (all 11 screens)

- `Login.jsx` — Auth with Supabase
- `Dashboard.jsx` — Stats, recent patients, risk distribution chart
- `PatientList.jsx` — Searchable patient cards
- `PatientProfile.jsx` — Full history + image gallery + risk timeline
- `NewPatient.jsx` — Multi-step registration form
- `Assessment.jsx` — Pre-extraction questionnaire + real-time BN updates
- `ImageCapture.jsx` — Camera API + image guidance overlay
- `AssessmentResults.jsx` — Risk gauge, factor breakdown, GPT-4o summary, recommendations
- `Reports.jsx` — PDF/CSV export, analytics
- `Settings.jsx` — Profile, notifications, sync
- `Help.jsx` — FAQ, documentation

---

### PWA Infrastructure

#### [NEW] `public/manifest.json` — App manifest
#### [NEW] `public/sw.js` — Service worker (cache-first for assets, network-first for API)
#### [NEW] `vite.config.js` — with `vite-plugin-pwa`

---

## Color System

| Token | Value | Use |
|-------|-------|-----|
| `primary` | `#2563EB` | CTA, active nav, headers |
| `surface` | `#F8FAFC` | Page background |
| `danger` | `#EF4444` | High risk |
| `warning` | `#F59E0B` | Medium risk |
| `success` | `#10B981` | Low risk |
| `text` | `#0F172A` | Primary text |

---

## Verification Plan

### Automated
- BN unit: `npm test` — verify P(DrySocket | allRiskFactors=true) > 0.85
- BN unit: verify P(DrySocket | allFactors=false) < 0.05
- Offline: enable airplane mode → complete assessment → re-enable → verify sync

### Manual / Browser Testing
- Login → create patient → complete assessment → image capture → results
- Verify risk meter animates correctly
- Verify PWA install prompt appears
- Verify offline badge appears when offline

---

## Open Questions

> [!IMPORTANT]
> **Supabase credentials**: You'll need to provide SUPABASE_URL and SUPABASE_ANON_KEY. I'll scaffold `.env.example` and the app will prompt if not configured.

> [!IMPORTANT]  
> **OpenAI API Key**: Required for GPT-4o Vision image analysis. Set `VITE_OPENAI_API_KEY` in `.env`. Without it, the app falls back to a heuristic image analyzer.

> [!NOTE]
> **Real patient training data**: The BN is pre-trained with published clinical priors. If you have a CSV of real patient outcomes, I can add a training script to update the CPTs automatically.
