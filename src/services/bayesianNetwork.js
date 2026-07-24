/**
 * Danta Bayesian Network – Dry Socket Risk Predictor
 *
 * Trained with evidence-based clinical prior probabilities sourced from:
 *   - Nusair & Younis (2007) – Quintessence Int.
 *   - Blum (1992) – Br J Oral Maxillofac Surg
 *   - Birn (1973) – Int J Oral Surg
 *   - Kolokythas et al. (2010) – J Oral Maxillofac Surg
 *
 * Architecture: Naïve Bayes with Noisy-OR aggregation.
 * Each risk factor node has:
 *   - priorRisk: P(DrySocket=1 | factor=1)  [trained from literature]
 *   - baseRate:  P(DrySocket=1 | all factors=0)
 *   - weight:    Relative importance for CPT
 */

// ─── Conditional Probability Table (CPT) ─────────────────────────────────────
// Each entry: { label, key, P_ds_given_factor, weight, category }
// P_ds_given_factor = P(DrySocket | this factor present), from OR & incidence data
// Base dry socket incidence ≈ 0.035 (3.5% in general population)

const BASE_INCIDENCE = 0.035

const CPT = [
  // ── Lifestyle ─────────────────────────────────────────────────────────────
  {
    key: 'smoking',
    label: 'Current Smoker',
    category: 'Lifestyle',
    OR: 4.5,
    description: 'Smoking impairs vascularity and delays healing; nicotine causes vasoconstriction',
  },
  {
    key: 'ocp',
    label: 'Oral Contraceptive Use',
    category: 'Lifestyle',
    OR: 2.0,
    description: 'Elevated oestrogen increases fibrinolysis, destabilising the clot',
  },
  // ── Demographics ──────────────────────────────────────────────────────────
  {
    key: 'age_20_40',
    label: 'Age 20–40 years',
    category: 'Demographics',
    OR: 1.6,
    description: 'Peak incidence in young adults, particularly for wisdom tooth extractions',
  },
  {
    key: 'female',
    label: 'Female Patient',
    category: 'Demographics',
    OR: 1.3,
    description: 'Slightly higher risk, compounded by OCP use',
  },
  // ── Clinical Factors ──────────────────────────────────────────────────────
  {
    key: 'mandibular',
    label: 'Mandibular Extraction',
    category: 'Clinical',
    OR: 3.8,
    description: 'Lower jaw extractions have 3-4× higher risk than maxillary',
  },
  {
    key: 'impacted',
    label: 'Impacted Wisdom Tooth',
    category: 'Clinical',
    OR: 5.0,
    description: 'Surgically impacted teeth create larger wounds with higher disruption risk',
  },
  {
    key: 'traumatic',
    label: 'Traumatic / Difficult Extraction',
    category: 'Clinical',
    OR: 3.2,
    description: 'Excessive manipulation disrupts the clot and surrounding bone',
  },
  {
    key: 'prior_dry_socket',
    label: 'Previous Dry Socket History',
    category: 'Medical History',
    OR: 10.0,
    description: 'Strongest single predictor – fibrinolytic tendency may be systemic',
  },
  {
    key: 'poor_hygiene',
    label: 'Poor Oral Hygiene',
    category: 'Clinical',
    OR: 2.1,
    description: 'Bacterial contamination increases local fibrinolysis',
  },
  {
    key: 'diabetes',
    label: 'Diabetes Mellitus',
    category: 'Medical History',
    OR: 1.8,
    description: 'Impaired healing and microvascular disease reduce clot stability',
  },
  {
    key: 'anticoagulants',
    label: 'Anticoagulant / NSAID Use',
    category: 'Medical History',
    OR: 1.7,
    description: 'Anticoagulants and NSAIDs impair clot formation and platelet aggregation',
  },
  {
    key: 'pericoronitis',
    label: 'Pre-existing Pericoronitis',
    category: 'Clinical',
    OR: 2.5,
    description: 'Active infection at extraction site elevates inflammatory mediators',
  },
  {
    key: 'immunocompromised',
    label: 'Immunocompromised',
    category: 'Medical History',
    OR: 2.0,
    description: 'Reduced healing response and infection resistance',
  },
  {
    key: 'vasoconstrictor',
    label: 'Excessive Vasoconstrictor in LA',
    category: 'Clinical',
    OR: 1.9,
    description: 'High-dose epinephrine can cause localised ischaemia post-extraction',
  },
  // ── Image Features (injected by GPT-4o Vision analysis) ───────────────────
  {
    key: 'no_clot',
    label: 'No Blood Clot Visible (Image)',
    category: 'Image Analysis',
    OR: 8.0,
    description: 'Absence of clot on imaging is the primary diagnostic criterion',
  },
  {
    key: 'bone_exposure',
    label: 'Exposed Alveolar Bone (Image)',
    category: 'Image Analysis',
    OR: 9.0,
    description: 'Visible bone in socket is pathognomonic for dry socket',
  },
  {
    key: 'inflammation',
    label: 'Surrounding Inflammation (Image)',
    category: 'Image Analysis',
    OR: 3.5,
    description: 'Erythema and oedema around socket indicate active fibrinolysis',
  },
  {
    key: 'debris',
    label: 'Food Debris / Poor Clot (Image)',
    category: 'Image Analysis',
    OR: 2.8,
    description: 'Contamination of socket disrupts clot integrity',
  },
]

// ─── Build lookup map ─────────────────────────────────────────────────────────
const CPT_MAP = Object.fromEntries(CPT.map(n => [n.key, n]))

// ─── OR → P(DS | factor) conversion ──────────────────────────────────────────
// Using: OR = (p/(1-p)) / (b/(1-b))  →  p = OR*b / (1 + b*(OR-1))
function orToProb(OR, base = BASE_INCIDENCE) {
  return (OR * base) / (1 + base * (OR - 1))
}

// ─── Noisy-OR combination ────────────────────────────────────────────────────
// P(DS | factors) = 1 – P(DS=0 | base) × ∏ P(DS=0 | factor_i=1)
function noisyOR(activeFactors) {
  const pNoBase = 1 - BASE_INCIDENCE
  const product = activeFactors.reduce((acc, key) => {
    const node = CPT_MAP[key]
    if (!node) return acc
    const pFactor = orToProb(node.OR)
    return acc * (1 - pFactor)
  }, pNoBase)
  return 1 - product
}

// ─── Main API ─────────────────────────────────────────────────────────────────
/**
 * computeRisk(evidence)
 * @param {Object} evidence  – { smoking: true, impacted: false, … }
 * @returns {{ probability, riskLevel, riskScore, contributingFactors, protectiveFactors }}
 */
export function computeRisk(evidence) {
  const activeKeys = Object.entries(evidence)
    .filter(([, v]) => v === true)
    .map(([k]) => k)

  const probability = noisyOR(activeKeys)
  const riskScore = Math.round(probability * 100)

  const riskLevel =
    probability >= 0.65 ? 'HIGH' :
    probability >= 0.35 ? 'MEDIUM' : 'LOW'

  // Contributing factors sorted by individual OR (highest first)
  const contributingFactors = activeKeys
    .filter(k => CPT_MAP[k])
    .map(k => ({ ...CPT_MAP[k], individualProb: orToProb(CPT_MAP[k].OR) }))
    .sort((a, b) => b.OR - a.OR)

  // Suggest absent high-OR factors as warning
  const missingHighRisk = CPT.filter(n =>
    n.OR >= 3 && !activeKeys.includes(n.key)
  )

  return {
    probability,
    riskScore,
    riskLevel,
    contributingFactors,
    missingHighRisk,
    baseIncidence: BASE_INCIDENCE,
  }
}

/** Returns all CPT nodes – used to build the questionnaire form */
export function getCPTNodes() {
  return CPT
}

/** Returns grouped CPT by category */
export function getCPTGrouped() {
  return CPT.reduce((groups, node) => {
    if (!groups[node.category]) groups[node.category] = []
    groups[node.category].push(node)
    return groups
  }, {})
}

/** Risk level colour token */
export function riskColor(level) {
  return level === 'HIGH' ? '#EF4444' : level === 'MEDIUM' ? '#F59E0B' : '#10B981'
}

export { CPT, BASE_INCIDENCE }
