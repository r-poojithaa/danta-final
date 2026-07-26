package com.danta.app

import android.content.res.ColorStateList
import android.graphics.Typeface
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.danta.app.databinding.ActivityResultBinding
import com.danta.app.logic.UnifiedRiskResult
import kotlinx.serialization.json.Json

class ResultActivity : AppCompatActivity() {

    private lateinit var binding: ActivityResultBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityResultBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val resultJson = intent.getStringExtra("result") ?: return
        val result = Json.decodeFromString<UnifiedRiskResult>(resultJson)

        displayResult(result)

        binding.btnDone.setOnClickListener {
            finish()
        }
        
        binding.toolbar.setNavigationOnClickListener { finish() }
    }

    private fun displayResult(result: UnifiedRiskResult) {
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

        // Factors
        result.contributingFactors.forEach { factor ->
            val textView = TextView(this).apply {
                text = "• ${factor.node.label}"
                setTextColor(ContextCompat.getColor(context, R.color.white))
                textSize = 15f
                setPadding(0, 8, 0, 8)
            }
            binding.factorsList.addView(textView)
        }

        // Recommendations
        result.recommendations.forEach { rec ->
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(16, 16, 16, 16)
                setBackgroundResource(R.drawable.camera_guide) 
                backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.surface_border))
                
                val title = TextView(context).apply {
                    text = rec.title
                    setTextColor(ContextCompat.getColor(context, R.color.accent))
                    textSize = 16f
                    setTypeface(null, Typeface.BOLD)
                }
                val detail = TextView(context).apply {
                    text = rec.detail
                    setTextColor(ContextCompat.getColor(context, R.color.text_secondary))
                    textSize = 13f
                    setPadding(0, 4, 0, 0)
                }
                addView(title)
                addView(detail)
            }
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, 16)
            }
            binding.recommendationsList.addView(card, lp)
        }
    }
}
