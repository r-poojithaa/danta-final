package com.danta.app.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.danta.app.R
import com.danta.app.databinding.ItemAssessmentBinding
import com.danta.app.logic.AssessmentRecord

class AssessmentAdapter(private val assessments: List<AssessmentRecord>) :
    RecyclerView.Adapter<AssessmentAdapter.ViewHolder>() {

    class ViewHolder(val binding: ItemAssessmentBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemAssessmentBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = assessments[position]
        holder.binding.patientName.text = "Patient ID: ${item.patient_id.take(8)}"
        holder.binding.assessmentDate.text = item.created_at?.take(10) ?: "Just now"
        holder.binding.riskScore.text = "${item.risk_score}%"
        holder.binding.riskChip.text = "${item.risk_level} RISK"
        
        val color = when (item.risk_level) {
            "HIGH" -> R.color.risk_high
            "MEDIUM" -> R.color.risk_medium
            else -> R.color.risk_low
        }
        val colorInt = ContextCompat.getColor(holder.itemView.context, color)
        holder.binding.riskChip.setChipBackgroundColorResource(color)
    }

    override fun getItemCount() = assessments.size
}
