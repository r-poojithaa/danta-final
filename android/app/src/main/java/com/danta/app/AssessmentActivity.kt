package com.danta.app

import android.content.Intent
import android.content.res.ColorStateList
import android.os.Bundle
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.danta.app.databinding.ActivityAssessmentBinding
import com.danta.app.logic.AssessmentRecord
import com.danta.app.logic.BayesianNetwork
import com.danta.app.logic.ImageAnalysisResult
import com.danta.app.logic.RiskCalculator
import com.danta.app.services.ClinicalRepository
import com.danta.app.services.SupabaseManager
import io.github.jan_tennert.supabase.auth.auth
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class AssessmentActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAssessmentBinding
    private val evidence = mutableMapOf<String, Boolean>()
    private var lastAiResult: ImageAnalysisResult? = null

    private val cameraLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == RESULT_OK) {
            // In a real app, result data would be here.
            // For now, we simulate vision evidence for the demo.
            evidence["no_clot"] = true
            updateRisk()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAssessmentBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupFactors()

        binding.btnSaveAssessment.setOnClickListener {
            handleSave()
        }

        binding.riskProgress.setOnClickListener {
            cameraLauncher.launch(Intent(this, CameraActivity::class.java))
        }
        
        binding.toolbar.setNavigationOnClickListener { finish() }
    }

    private fun setupFactors() {
        val factors = BayesianNetwork.CPT.filter { it.category != "Image Analysis" }
        factors.forEach { node ->
            val checkBox = CheckBox(this).apply {
                text = node.label
                setTextColor(ContextCompat.getColor(context, R.color.white))
                buttonTintList = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.accent))
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = 8
                    bottomMargin = 8
                }
                setOnCheckedChangeListener { _, isChecked ->
                    evidence[node.key] = isChecked
                    updateRisk()
                }
            }
            binding.factorsContainer.addView(checkBox)
        }
    }

    private fun updateRisk() {
        val result = RiskCalculator.calculateUnifiedRisk(evidence, lastAiResult)
        
        binding.riskScoreText.text = "${result.riskScore}%"
        binding.riskLevelText.text = "${result.riskLevel} RISK"
        binding.riskProgress.progress = result.riskScore
        
        val color = when (result.riskLevel) {
            "HIGH" -> R.color.risk_high
            "MEDIUM" -> R.color.risk_medium
            else -> R.color.risk_low
        }
        
        val colorInt = ContextCompat.getColor(this, color)
        binding.riskLevelText.setTextColor(colorInt)
        binding.riskProgress.setIndicatorColor(colorInt)
    }

    private fun handleSave() {
        val patientName = binding.patientNameInput.text.toString().trim()
        if (patientName.isEmpty()) {
            Toast.makeText(this, "Please enter patient name", Toast.LENGTH_SHORT).show()
            return
        }

        val result = RiskCalculator.calculateUnifiedRisk(evidence, lastAiResult)
        val userId = SupabaseManager.client.auth.currentSessionOrNull()?.user?.id ?: ""

        lifecycleScope.launch {
            try {
                val record = AssessmentRecord(
                    patient_id = patientName, // Using name as ID for Phase 1 simplicity
                    created_by = userId,
                    risk_score = result.riskScore,
                    risk_level = result.riskLevel,
                    factors = evidence,
                    recommendations = result.recommendations
                )
                
                ClinicalRepository.saveAssessment(record)
                
                // Show Result Screen
                val intent = Intent(this@AssessmentActivity, ResultActivity::class.java).apply {
                    putExtra("result", Json.encodeToString(result))
                }
                startActivity(intent)
                finish()
                
            } catch (e: Exception) {
                Toast.makeText(this@AssessmentActivity, "Failed to save: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
