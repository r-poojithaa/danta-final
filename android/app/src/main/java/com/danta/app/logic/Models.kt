package com.danta.app.logic

import kotlinx.serialization.Serializable

@Serializable
data class Patient(
    val id: String? = null,
    val name: String,
    val age: Int,
    val gender: String,
    val clinical_id: String, // Linking to the doctor/user
    val created_at: String? = null
)

@Serializable
data class AssessmentRecord(
    val id: String? = null,
    val patient_id: String,
    val created_by: String,
    val risk_score: Int,
    val risk_level: String,
    val factors: Map<String, Boolean>,
    val recommendations: List<Recommendation>,
    val created_at: String? = null
)
