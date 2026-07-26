package com.danta.app.logic

import kotlinx.serialization.Serializable
import kotlin.math.roundToInt

@Serializable
data class UnifiedRiskResult(
    val probability: Double,
    val riskScore: Int,
    val riskLevel: String,
    val contributingFactors: List<CPTNodeWithProb>,
    val bnProbability: Double,
    val imageProbability: Double?,
    val fusionNote: String,
    val recommendations: List<Recommendation>
)

@Serializable
data class Recommendation(
    val priority: String,
    val title: String,
    val detail: String
)

object RiskCalculator {

    fun calculateUnifiedRisk(
        clinicalEvidence: Map<String, Boolean>,
        imageAnalysis: ImageAnalysisResult? = null
    ): UnifiedRiskResult {
        // 1. Merge image evidence
        val mergedEvidence = clinicalEvidence.toMutableMap()
        imageAnalysis?.bnEvidence?.forEach { (key, value) ->
            mergedEvidence[key] = mergedEvidence[key] == true || value
        }

        // 2. Run Bayesian Network
        val bnResult = BayesianNetwork.computeRisk(mergedEvidence)

        // 3. 60/40 Weighted Fusion
        val imageScore = imageAnalysis?.imageRiskScore
        var finalProbability = bnResult.probability
        var fusionNote = "Clinical factors only"

        if (imageScore != null && (imageAnalysis.confidence ?: 0.0) > 0.4) {
            val imageProb = imageScore.toDouble() / 100.0
            finalProbability = (bnResult.probability * 0.60) + (imageProb * 0.40)
            fusionNote = "Balanced Fusion: Clinical (60%) + AI Vision (40%, confidence: ${(imageAnalysis.confidence!! * 100).roundToInt()}%)"
        }

        val riskScore = (finalProbability * 100).roundToInt()
        val riskLevel = when {
            finalProbability >= 0.65 -> "HIGH"
            finalProbability >= 0.35 -> "MEDIUM"
            else -> "LOW"
        }

        val recommendations = generateRecommendations(riskLevel, bnResult.contributingFactors.map { it.node.key }, imageAnalysis)

        return UnifiedRiskResult(
            probability = finalProbability,
            riskScore = riskScore,
            riskLevel = riskLevel,
            contributingFactors = bnResult.contributingFactors,
            bnProbability = bnResult.probability,
            imageProbability = imageScore?.toDouble()?.div(100.0),
            fusionNote = fusionNote,
            recommendations = recommendations
        )
    }

    private fun generateRecommendations(
        riskLevel: String,
        factorKeys: List<String>,
        imageAnalysis: ImageAnalysisResult?
    ): List<Recommendation> {
        val recs = mutableListOf<Recommendation>()

        when (riskLevel) {
            "HIGH" -> {
                recs.add(Recommendation("URGENT", "Immediate Preventive Protocol", "Consider prophylactic dry socket dressing (Alvogyl/ZOE) and chlorhexidine irrigation"))
                recs.add(Recommendation("HIGH", "Enhanced Post-op Instructions", "Avoid smoking for minimum 72h, no straws, soft diet for 7 days, saline rinses after 24h"))
                recs.add(Recommendation("HIGH", "Early Follow-up", "Schedule 48–72h review appointment. Provide emergency contact number."))
            }
            "MEDIUM" -> {
                recs.add(Recommendation("MODERATE", "Standard Preventive Measures", "Chlorhexidine gel application to socket. Detailed verbal and written post-op instructions."))
                recs.add(Recommendation("MODERATE", "Follow-up in 5–7 days", "Routine post-extraction review with socket assessment"))
            }
            "LOW" -> {
                recs.add(Recommendation("ROUTINE", "Standard Post-op Care", "Standard post-extraction instructions. Follow-up only if symptoms develop."))
            }
        }

        if (factorKeys.contains("smoking")) {
            recs.add(Recommendation(if (riskLevel == "HIGH") "HIGH" else "MODERATE", "Smoking Cessation", "Advise cessation for minimum 48–72h before and after extraction"))
        }
        if (factorKeys.contains("impacted") || factorKeys.contains("traumatic")) {
            recs.add(Recommendation("HIGH", "Traumatic Extraction Protocol", "Consider primary closure, platelet-rich plasma (PRP), or bone wax application"))
        }
        if (factorKeys.contains("prior_dry_socket")) {
            recs.add(Recommendation("URGENT", "Prior Dry Socket – High Alert", "Patient has strong systemic fibrinolytic tendency. Prophylactic Alvogyl strongly recommended."))
        }
        if (imageAnalysis?.boneExposure == true) {
            recs.add(Recommendation("URGENT", "Bone Exposure Detected on Image", "Immediate clinical assessment required. Apply medicated dressing if confirmed."))
        }

        return recs
    }
}

@Serializable
data class ImageAnalysisResult(
    val bnEvidence: Map<String, Boolean>? = null,
    val imageRiskScore: Int? = null,
    val confidence: Double? = null,
    val boneExposure: Boolean? = null
)
