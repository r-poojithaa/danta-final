package com.danta.app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.danta.app.adapters.AssessmentAdapter
import com.danta.app.databinding.ActivityDashboardBinding
import com.danta.app.services.ClinicalRepository
import com.danta.app.services.SupabaseManager
import io.github.jan_tennert.supabase.auth.auth
import kotlinx.coroutines.launch
import java.util.Calendar

class DashboardActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDashboardBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            binding = ActivityDashboardBinding.inflate(layoutInflater)
            setContentView(binding.root)

            setupUI()
            loadData()
        } catch (e: Exception) {
            Log.e("DashboardActivity", "Error in onCreate", e)
            Toast.makeText(this, "Failed to load dashboard: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun setupUI() {
        binding.greetingText.text = "Good ${getTimeOfDay()}, Doctor"
        
        binding.btnNewAssessment.setOnClickListener {
            startActivity(Intent(this, AssessmentActivity::class.java))
        }

        binding.rvRecentAssessments.layoutManager = LinearLayoutManager(this)
    }

    private fun loadData() {
        lifecycleScope.launch {
            try {
                val userId = SupabaseManager.client.auth.currentSessionOrNull()?.user?.id ?: return@launch
                
                // Fetch Stats
                val stats = ClinicalRepository.getStats(userId)
                binding.totalPatientsCount.text = stats["patients"].toString()
                binding.highRiskCount.text = stats["high_risk"].toString()
                
                // Fetch Recent Assessments
                val assessments = ClinicalRepository.getRecentAssessments(userId)
                if (assessments.isEmpty()) {
                    binding.rvRecentAssessments.visibility = View.GONE
                    binding.emptyStateText.visibility = View.VISIBLE
                } else {
                    binding.rvRecentAssessments.visibility = View.VISIBLE
                    binding.emptyStateText.visibility = View.GONE
                    binding.rvRecentAssessments.adapter = AssessmentAdapter(assessments)
                }

            } catch (e: Exception) {
                Log.e("DashboardActivity", "Data loading failed", e)
                Toast.makeText(this@DashboardActivity, "Connection error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun getTimeOfDay(): String {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return when (hour) {
            in 0..11 -> "morning"
            in 12..16 -> "afternoon"
            else -> "evening"
        }
    }
    
    override fun onResume() {
        super.onResume()
        loadData() // Refresh on return
    }
}
