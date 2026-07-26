package com.danta.app.services

import android.util.Base64
import com.danta.app.BuildConfig
import com.danta.app.logic.ImageAnalysisResult
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object VisionAIService {
    private val GROK_API_KEY = BuildConfig.GROK_API_KEY
    private const val API_URL = "https://api.groq.com/openai/v1/chat/completions"

    private const val SYSTEM_PROMPT = """
        Act as an expert clinical auditor. Analyze the intraoral photo for dry socket pathology. 
        
        PHYSICAL ANCHORING (Unique to every capture):
        Before discussing pathology, describe 2-3 unique physical artifacts in this photo (e.g. "Bright glare on the tooth", "Deep shadow at the base"). This ensures the analysis is tied to the unique pixels of this specific capture.
        
        CLINICAL CRITERIA:
        1. Examine the socket floor for color (ruby-red vs grey/empty).
        2. Look for high-contrast creamy areas (exposed bone).
        3. Check gingival cuff for edema/erythema.
        
        Respond ONLY in valid JSON:
        {
          "visual_landmark": "Physical artifacts, lighting, and angle description.",
          "clinical_finding": "Detailed description of the socket tissue and bone state.",
          "clot_present": boolean,
          "bone_exposure": boolean,
          "inflammation_level": "none" | "mild" | "moderate" | "severe",
          "debris_present": boolean,
          "healing_stage": "early" | "intermediate" | "late" | "disrupted" | "cannot_assess",
          "confidence": number,
          "clinical_notes": "Objective diagnostic summary.",
          "dry_socket_indicators": ["List abnormal findings"],
          "recommended_actions": ["Clinical steps"]
        }
    """

    private val client = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    suspend fun analyzeImage(imageBytes: ByteArray): ImageAnalysisResult? {
        val base64Image = Base64.encodeToString(imageBytes, Base64.NO_WRAP)
        val dataUrl = "data:image/jpeg;base64,$base64Image"
        val randomSeed = Math.random().toString()

        val json = JSONObject().apply {
            put("model", "qwen/qwen3.6-27b")
            put("messages", org.json.JSONArray().apply {
                put(JSONObject().apply {
                    put("role", "user")
                    put("content", org.json.JSONArray().apply {
                        put(JSONObject().apply {
                            put("type", "text")
                            put("text", "$SYSTEM_PROMPT\n\n[RANDOM_SEED: $randomSeed]\nAnalyze this specific photo for clinical evidence and output valid JSON.")
                        })
                        put(JSONObject().apply {
                            put("type", "image_url")
                            put("image_url", JSONObject().apply {
                                put("url", dataUrl)
                            })
                        })
                    })
                })
            })
            put("response_format", JSONObject().apply { put("type", "json_object") })
            put("temperature", 0.6)
            put("top_p", 0.95)
            put("max_tokens", 4096)
        }

        val request = Request.Builder()
            .url(API_URL)
            .addHeader("Authorization", "Bearer $GROK_API_KEY")
            .addHeader("Content-Type", "application/json")
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val body = response.body?.string()
                if (body != null) {
                    val responseJson = JSONObject(body)
                    val content = responseJson.getJSONArray("choices").getJSONObject(0).getJSONObject("message").getString("content")
                    parseAnalysisResult(content)
                } else {
                    null
                }
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun parseAnalysisResult(content: String): ImageAnalysisResult {
        val json = JSONObject(content)
        val bnEvidence = mutableMapOf<String, Boolean>()
        
        bnEvidence["no_clot"] = json.optBoolean("clot_present") == false
        bnEvidence["bone_exposure"] = json.optBoolean("bone_exposure") == true
        bnEvidence["inflammation"] = listOf("moderate", "severe").contains(json.optString("inflammation_level"))
        bnEvidence["debris"] = json.optBoolean("debris_present") == true

        return ImageAnalysisResult(
            bnEvidence = bnEvidence,
            imageRiskScore = calculateImageRiskScore(json),
            confidence = json.optDouble("confidence", 0.0),
            boneExposure = json.optBoolean("bone_exposure")
        )
    }

    private fun calculateImageRiskScore(json: JSONObject): Int {
        var score = 0
        if (json.optBoolean("clot_present") == false) score += 50
        if (json.optBoolean("bone_exposure")) score += 60
        
        val infl = json.optString("inflammation_level")
        if (infl == "severe") score += 25
        else if (infl == "moderate") score += 15
        
        if (json.optBoolean("debris_present")) score += 15
        return Math.min(100, score)
    }
}
