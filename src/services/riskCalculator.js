/**
 * Risk Calculator – fuses Bayesian Network + Image Analysis scores
 */
import { computeRisk, riskColor } from './bayesianNetwork.js'
import { imageToBNEvidence } from './imageAnalysis.js'

/**
 * Compute unified dry socket risk from clinical evidence + image analysis
 * @param {Object} clinicalEvidence   – BN keys from questionnaire
 * @param {Object|null} imageAnalysis – result from analyzeImage()
 * @returns {DrySocketRiskResult}
 */
export function calculateUnifiedRisk(clinicalEvidence = {}, imageAnalysis = null) {
  // 1. Merge image BN evidence into clinical evidence
  const imageEvidence = imageAnalysis ? imageToBNEvidence(imageAnalysis) : {}
  const mergedEvidence = { ...clinicalEvidence, ...imageEvidence }

  // 2. Run Bayesian Network
  const bnResult = computeRisk(mergedEvidence)

  // 3. Weighted fusion
  // If image available: 60% clinical BN + 40% image-adjusted BN
  // If no image: 100% clinical BN
  const imageScore = imageAnalysis?.image_risk_score ?? null

  let finalProbability = bnResult.probability
  let fusionNote = 'Clinical factors only'

  if (imageScore !== null && imageAnalysis?.confidence > 0.3) {
    const imageProb = imageScore / 100
    finalProbability = 0.60 * bnResult.probability + 0.40 * imageProb
    fusionNote = `Clinical BN (60%) + Image analysis (40%, confidence: ${Math.round(imageAnalysis.confidence * 100)}%)`
  }

  const riskScore = Math.round(finalProbability * 100)
  const riskLevel = finalProbability >= 0.65 ? 'HIGH' : finalProbability >= 0.35 ? 'MEDIUM' : 'LOW'

  // 4. Generate recommendations
  const recommendations = generateRecommendations(riskLevel, bnResult.contributingFactors, imageAnalysis)

  return {
    probability: finalProbability,
    riskScore,
    riskLevel,
    riskColor: riskColor(riskLevel),
    contributingFactors: bnResult.contributingFactors,
    bnProbability: bnResult.probability,
    imageProbability: imageScore !== null ? imageScore / 100 : null,
    imageAnalysis,
    recommendations,
    fusionNote,
    timestamp: new Date().toISOString(),
  }
}

function generateRecommendations(riskLevel, factors, imageAnalysis) {
  const recs = []

  if (riskLevel === 'HIGH') {
    recs.push({
      priority: 'URGENT',
      title: 'Immediate Preventive Protocol',
      detail: 'Consider prophylactic dry socket dressing (Alvogyl/ZOE) and chlorhexidine irrigation',
    })
    recs.push({
      priority: 'HIGH',
      title: 'Enhanced Post-op Instructions',
      detail: 'Avoid smoking for minimum 72h, no straws, soft diet for 7 days, saline rinses after 24h',
    })
    recs.push({
      priority: 'HIGH',
      title: 'Early Follow-up',
      detail: 'Schedule 48–72h review appointment. Provide emergency contact number.',
    })
  }

  if (riskLevel === 'MEDIUM') {
    recs.push({
      priority: 'MODERATE',
      title: 'Standard Preventive Measures',
      detail: 'Chlorhexidine gel application to socket. Detailed verbal and written post-op instructions.',
    })
    recs.push({
      priority: 'MODERATE',
      title: 'Follow-up in 5–7 days',
      detail: 'Routine post-extraction review with socket assessment',
    })
  }

  if (riskLevel === 'LOW') {
    recs.push({
      priority: 'ROUTINE',
      title: 'Standard Post-op Care',
      detail: 'Standard post-extraction instructions. Follow-up only if symptoms develop.',
    })
  }

  // Factor-specific recommendations
  const factorKeys = factors.map(f => f.key)

  if (factorKeys.includes('smoking')) {
    recs.push({
      priority: riskLevel === 'HIGH' ? 'HIGH' : 'MODERATE',
      title: 'Smoking Cessation',
      detail: 'Advise cessation for minimum 48–72h before and after extraction',
    })
  }

  if (factorKeys.includes('impacted') || factorKeys.includes('traumatic')) {
    recs.push({
      priority: 'HIGH',
      title: 'Traumatic Extraction Protocol',
      detail: 'Consider primary closure, platelet-rich plasma (PRP), or bone wax application',
    })
  }

  if (factorKeys.includes('prior_dry_socket')) {
    recs.push({
      priority: 'URGENT',
      title: 'Prior Dry Socket – High Alert',
      detail: 'Patient has strong systemic fibrinolytic tendency. Prophylactic Alvogyl strongly recommended.',
    })
  }

  if (imageAnalysis?.bone_exposure) {
    recs.push({
      priority: 'URGENT',
      title: 'Bone Exposure Detected on Image',
      detail: 'Immediate clinical assessment required. Apply medicated dressing if confirmed.',
    })
  }

  return recs
}
