package com.danta.app.logic

import kotlinx.serialization.Serializable
import kotlin.math.roundToInt

@Serializable
data class CPTNode(
    val key: String,
    val label: String,
    val category: String,
    val OR: Double,
    val description: String
)

@Serializable
data class RiskResult(
    val probability: Double,
    val riskScore: Int,
    val riskLevel: String,
    val contributingFactors: List<CPTNodeWithProb>,
    val missingHighRisk: List<CPTNode>
)

@Serializable
data class CPTNodeWithProb(
    val node: CPTNode,
    val individualProb: Double
)

object BayesianNetwork {
    private const val BASE_INCIDENCE = 0.035

    val CPT = listOf(
        CPTNode("smoking", "Current Smoker", "Lifestyle", 4.5, "Smoking impairs vascularity and delays healing; nicotine causes vasoconstriction"),
        CPTNode("ocp", "Oral Contraceptive Use", "Lifestyle", 2.0, "Elevated oestrogen increases fibrinolysis, destabilising the clot"),
        CPTNode("age_20_40", "Age 20–40 years", "Demographics", 1.6, "Peak incidence in young adults, particularly for wisdom tooth extractions"),
        CPTNode("female", "Female Patient", "Demographics", 1.3, "Slightly higher risk, compounded by OCP use"),
        CPTNode("mandibular", "Mandibular Extraction", "Clinical", 3.8, "Lower jaw extractions have 3-4× higher risk than maxillary"),
        CPTNode("impacted", "Impacted Wisdom Tooth", "Clinical", 5.0, "Surgically impacted teeth create larger wounds with higher disruption risk"),
        CPTNode("traumatic", "Traumatic / Difficult Extraction", "Clinical", 3.2, "Excessive manipulation disrupts the clot and surrounding bone"),
        CPTNode("prior_dry_socket", "Previous Dry Socket History", "Medical History", 10.0, "Strongest single predictor – fibrinolytic tendency may be systemic"),
        CPTNode("poor_hygiene", "Poor Oral Hygiene", "Clinical", 2.1, "Bacterial contamination increases local fibrinolysis"),
        CPTNode("diabetes", "Diabetes Mellitus", "Medical History", 1.8, "Impaired healing and microvascular disease reduce clot stability"),
        CPTNode("anticoagulants", "Anticoagulant / NSAID Use", "Medical History", 1.7, "Anticoagulants and NSAIDs impair clot formation and platelet aggregation"),
        CPTNode("pericoronitis", "Pre-existing Pericoronitis", "Clinical", 2.5, "Active infection at extraction site elevates inflammatory mediators"),
        CPTNode("immunocompromised", "Immunocompromised", "Medical History", 2.0, "Reduced healing response and infection resistance"),
        CPTNode("vasoconstrictor", "Excessive Vasoconstrictor in LA", "Clinical", 1.9, "High-dose epinephrine can cause localised ischaemia post-extraction"),
        CPTNode("no_clot", "No Blood Clot Visible (Image)", "Image Analysis", 8.0, "Absence of clot on imaging is the primary diagnostic criterion"),
        CPTNode("bone_exposure", "Exposed Alveolar Bone (Image)", "Image Analysis", 9.0, "Visible bone in socket is pathognomonic for dry socket"),
        CPTNode("inflammation", "Surrounding Inflammation (Image)", "Image Analysis", 3.5, "Erythema and oedema around socket indicate active fibrinolysis"),
        CPTNode("debris", "Food Debris / Poor Clot (Image)", "Image Analysis", 2.8, "Contamination of socket disrupts clot integrity")
    )

    private val CPT_MAP = CPT.associateBy { it.key }

    private fun orToProb(OR: Double, base: Double = BASE_INCIDENCE): Double {
        return (OR * base) / (1 + base * (OR - 1))
    }

    private fun noisyOR(activeKeys: List<String>): Double {
        val pNoBase = 1.0 - BASE_INCIDENCE
        var product = pNoBase
        activeKeys.forEach { key ->
            val node = CPT_MAP[key]
            if (node != null) {
                val pFactor = orToProb(node.OR)
                product *= (1.0 - pFactor)
            }
        }
        return 1.0 - product
    }

    fun computeRisk(evidence: Map<String, Boolean>): RiskResult {
        val activeKeys = evidence.filter { it.value }.keys.toList()
        val probability = noisyOR(activeKeys)
        val riskScore = (probability * 100).roundToInt()

        val riskLevel = when {
            probability >= 0.65 -> "HIGH"
            probability >= 0.35 -> "MEDIUM"
            else -> "LOW"
        }

        val contributingFactors = activeKeys
            .mapNotNull { key -> CPT_MAP[key]?.let { CPTNodeWithProb(it, orToProb(it.OR)) } }
            .sortedByDescending { it.node.OR }

        val missingHighRisk = CPT.filter { node ->
            node.OR >= 3.0 && !activeKeys.contains(node.key)
        }

        return RiskResult(
            probability = probability,
            riskScore = riskScore,
            riskLevel = riskLevel,
            contributingFactors = contributingFactors,
            missingHighRisk = missingHighRisk
        )
    }
}
