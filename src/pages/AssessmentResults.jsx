import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Share2, CheckCircle, AlertTriangle, XCircle, Microscope, Brain } from 'lucide-react'
import Header from '../components/layout/Header.jsx'
import BottomNav from '../components/layout/BottomNav.jsx'
import RiskMeter from '../components/ui/RiskMeter.jsx'

const PRIORITY_COLOR = {
  URGENT: { bg: 'bg-risk-high/10', border: 'border-risk-high/40', text: 'text-risk-high', icon: XCircle },
  HIGH: { bg: 'bg-risk-high/10', border: 'border-risk-high/30', text: 'text-risk-high', icon: AlertTriangle },
  MODERATE: { bg: 'bg-risk-medium/10', border: 'border-risk-medium/30', text: 'text-risk-medium', icon: AlertTriangle },
  ROUTINE: { bg: 'bg-risk-low/10', border: 'border-risk-low/30', text: 'text-risk-low', icon: CheckCircle },
}

export default function AssessmentResults() {
  const { patientId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const { riskResult, patient, analysisResults = [], images = [] } = state ?? {}

  if (!riskResult) {
    return (
      <div className="min-h-dvh bg-surface flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">No assessment data found.</p>
        <button onClick={() => navigate('/patients')} className="btn-primary">Go to Patients</button>
      </div>
    )
  }

  const { riskScore, riskLevel, riskColor, contributingFactors, recommendations, fusionNote,
          bnProbability, imageProbability, imageAnalysis } = riskResult

  const handlePrint = () => window.print()

  return (
    <div className="min-h-dvh bg-surface pb-24 pt-16">
      <Header title="Assessment Results" />

      <main className="px-4 py-5 max-w-lg mx-auto space-y-5 animate-fade-in">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Risk meter card */}
        <div className="card flex flex-col items-center py-6">
          <RiskMeter score={riskScore} level={riskLevel} size={240} />
          <div className="mt-4 text-center px-6">
            <p className="text-xs text-slate-500">{fusionNote}</p>
          </div>

          {/* Score breakdown */}
          {imageProbability !== null && (
            <div className="mt-4 w-full grid grid-cols-2 gap-3">
              <div className="glass-light rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Brain size={14} className="text-primary" />
                  <span className="text-xs text-slate-400">Clinical BN</span>
                </div>
                <div className="text-xl font-bold text-white">{Math.round(bnProbability * 100)}</div>
                <div className="text-xs text-slate-500">60% weight</div>
              </div>
              <div className="glass-light rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Microscope size={14} className="text-accent" />
                  <span className="text-xs text-slate-400">Image AI</span>
                </div>
                <div className="text-xl font-bold text-white">{Math.round(imageProbability * 100)}</div>
                <div className="text-xs text-slate-500">40% weight</div>
              </div>
            </div>
          )}
        </div>

        {/* Image analysis results */}
        {imageAnalysis && (
          <div className="card space-y-3">
            <div className="section-title flex items-center gap-2">
              <Microscope size={16} className="text-accent" />
              AI Image Analysis
              <span className="ml-auto text-xs text-slate-500">
                Confidence: {Math.round((imageAnalysis.confidence ?? 0) * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Blood Clot', value: imageAnalysis.clot_present, trueColor: 'text-risk-low', falseColor: 'text-risk-high', trueText: 'Present', falseText: 'Absent ⚠️', nullText: 'N/A' },
                { label: 'Bone Exposure', value: imageAnalysis.bone_exposure, trueColor: 'text-risk-high', falseColor: 'text-risk-low', trueText: 'Detected ⚠️', falseText: 'None', nullText: 'N/A' },
                { label: 'Inflammation', value: imageAnalysis.inflammation_level, isString: true },
                { label: 'Debris', value: imageAnalysis.debris_present, trueColor: 'text-risk-medium', falseColor: 'text-risk-low', trueText: 'Present', falseText: 'Clear', nullText: 'N/A' },
              ].map(item => (
                <div key={item.label} className="bg-surface border border-surface-border rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-1">{item.label}</div>
                  {item.isString ? (
                    <div className={`text-sm font-bold capitalize ${
                      item.value === 'severe' ? 'text-risk-high' :
                      item.value === 'moderate' ? 'text-risk-medium' :
                      item.value === 'mild' ? 'text-risk-medium' : 'text-risk-low'
                    }`}>{item.value ?? 'None'}</div>
                  ) : (
                    <div className={`text-sm font-bold ${
                      item.value === null ? 'text-slate-500' :
                      item.value ? item.trueColor : item.falseColor
                    }`}>
                      {item.value === null ? item.nullText : item.value ? item.trueText : item.falseText}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {imageAnalysis.clinical_notes && (
              <div className="bg-surface border border-surface-border rounded-xl p-3">
                <div className="text-xs text-slate-400 mb-1">Clinical Notes (AI)</div>
                <p className="text-sm text-slate-300">{imageAnalysis.clinical_notes}</p>
              </div>
            )}

            {imageAnalysis.dry_socket_indicators?.length > 0 && (
              <div>
                <div className="text-xs text-slate-400 mb-2">Dry Socket Indicators Found</div>
                <div className="space-y-1">
                  {imageAnalysis.dry_socket_indicators.map((ind, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle size={13} className="text-risk-high mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-slate-300">{ind}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contributing factors */}
        {contributingFactors.length > 0 && (
          <div className="card">
            <div className="section-title flex items-center gap-2">
              <Brain size={16} className="text-primary" />
              Contributing Risk Factors
            </div>
            <div className="space-y-2">
              {contributingFactors.map(f => {
                const pct = Math.round(f.individualProb * 100)
                return (
                  <div key={f.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{f.label}</span>
                      <span className={`font-bold ${f.OR >= 5 ? 'text-risk-high' : f.OR >= 3 ? 'text-risk-medium' : 'text-slate-400'}`}>
                        OR {f.OR}× · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: f.OR >= 5 ? '#EF4444' : f.OR >= 3 ? '#F59E0B' : '#2563EB'
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="card">
            <div className="section-title">Clinical Recommendations</div>
            <div className="space-y-3">
              {recommendations.map((rec, i) => {
                const style = PRIORITY_COLOR[rec.priority] ?? PRIORITY_COLOR.ROUTINE
                const Icon = style.icon
                return (
                  <div key={i} className={`${style.bg} border ${style.border} rounded-xl p-4`}>
                    <div className="flex items-start gap-2">
                      <Icon size={15} className={`${style.text} mt-0.5 flex-shrink-0`} />
                      <div>
                        <div className={`text-sm font-bold ${style.text}`}>{rec.title}</div>
                        <div className="text-xs text-slate-300 mt-1">{rec.detail}</div>
                      </div>
                      <span className={`ml-auto text-[10px] font-bold ${style.text} flex-shrink-0`}>{rec.priority}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => navigate(`/patients/${patientId}`)} className="flex-1 btn-primary flex items-center justify-center gap-2">
            <CheckCircle size={16} />
            Save to Record
          </button>
          <button onClick={handlePrint} className="btn-ghost border border-surface-border rounded-xl px-4 flex items-center gap-2">
            <Download size={16} />
          </button>
          <button className="btn-ghost border border-surface-border rounded-xl px-4 flex items-center gap-2">
            <Share2 size={16} />
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
