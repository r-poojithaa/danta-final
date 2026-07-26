package com.danta.app.services

import com.danta.app.logic.AssessmentRecord
import com.danta.app.logic.Patient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object ClinicalRepository {

    suspend fun getStats(userId: String): Map<String, Int> = withContext(Dispatchers.IO) {
        try {
            val patients = SupabaseManager.client.postgrest.from("patients")
                .select {
                    filter {
                        eq("clinical_id", userId)
                    }
                }.decodeList<Patient>().size

            val highRisk = SupabaseManager.client.postgrest.from("assessments")
                .select {
                    filter {
                        eq("created_by", userId)
                        eq("risk_level", "HIGH")
                    }
                }.decodeList<AssessmentRecord>().size

            mapOf("patients" to patients, "high_risk" to highRisk)
        } catch (e: Exception) {
            mapOf("patients" to 0, "high_risk" to 0)
        }
    }

    suspend fun getRecentAssessments(userId: String): List<AssessmentRecord> = withContext(Dispatchers.IO) {
        try {
            SupabaseManager.client.postgrest.from("assessments")
                .select {
                    filter {
                        eq("created_by", userId)
                    }
                    order("created_at", order = Order.DESCENDING)
                    limit(10)
                }.decodeList<AssessmentRecord>()
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun saveAssessment(record: AssessmentRecord) = withContext(Dispatchers.IO) {
        SupabaseManager.client.postgrest.from("assessments").insert(record)
    }

    suspend fun getPatients(userId: String): List<Patient> = withContext(Dispatchers.IO) {
        try {
            SupabaseManager.client.postgrest.from("patients")
                .select {
                    filter {
                        eq("clinical_id", userId)
                    }
                }.decodeList<Patient>()
        } catch (e: Exception) {
            emptyList()
        }
    }
}
