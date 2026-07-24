import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Camera, ChevronRight, Activity, AlertTriangle } from 'lucide-react'
import Header from '../components/layout/Header.jsx'
import BottomNav from '../components/layout/BottomNav.jsx'
import RiskMeter from '../components/ui/RiskMeter.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { usePatients } from '../hooks/usePatients.js'
import { patients as supabasePatients, assessments } from '../services/supabase.js'
import { getCPTGrouped } from '../services/bayesianNetwork.js'
import { calculateUnifiedRisk } from '../services/riskCalculator.js'
import { analyzeImage } from '../services/imageAnalysis.js'

export default function Assessment() {
  const { patientId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [patient, setPatient] = useState(null)
  const [evidence, setEvidence] = useState(location.state?.evidence ?? {})
  const [extraFields, setExtraFields] = useState(location.state?.extraFields ?? {
    extraction_site: '', tooth_number: '', extraction_type: 'simple', notes: ''
  })
  const [riskResult, setRiskResult] = useState(null)
  const [capturedImages, setCapturedImages] = useState(location.state?.capturedImages ?? [])
  const [saving, setSaving] = useState(false)
  
  const [isAnalyzingUpload, setIsAnalyzingUpload] = useState(false)
  const [imageAnalysisResults, setImageAnalysisResults] = useState(location.state?.analysisResults ?? [])
  const [mergedImageEvidence, setMergedImageEvidence] = useState(location.state?.mergedImageEvidence ?? {})

  const cptGroups = getCPTGrouped()

  useEffect(() => {
    if (patientId && Object.keys(evidence).length === 0 && !location.state?.evidence) {
      supabasePatients.getById(patientId).then(({ data }) => {
        if (data) {
          setPatient(data)
          // Pre-fill BN evidence from patient profile
          const prefill = {}
          if (data.smoking_status === 'current' || data.smoking_status === 'heavy') prefill.smoking = true
          if (data.ocp_use) prefill.ocp = true
          if (data.previous_dry_socket) prefill.prior_dry_socket = true
          if (data.medical_conditions?.includes('Diabetes')) prefill.diabetes = true
          if (data.medical_conditions?.includes('Immunocompromised')) prefill.immunocompromised = true
          if (data.gender === 'Female') prefill.female = true
          const dobAge = data.date_of_birth
            ? Math.floor((Date.now() - new Date(data.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25))
            : null
          if (dobAge >= 20 && dobAge <= 40) prefill.age_20_40 = true
          setEvidence(prefill)
        }
      })
    } else if (patientId) {
      supabasePatients.getById(patientId).then(({ data }) => setPatient(data))
    }
  }, [patientId, location.state?.evidence])

  // Live risk recalculation whenever evidence changes
  useEffect(() => {
    const combinedEvidence = { ...evidence, ...mergedImageEvidence }
    const lastResult = imageAnalysisResults.find(r => !r.error) ?? null
    const result = calculateUnifiedRisk(combinedEvidence, lastResult)
    setRiskResult(result)
  }, [evidence, mergedImageEvidence, imageAnalysisResults])

  const handleDirectUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setIsAnalyzingUpload(true)
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      const src = event.target.result
      const newImage = { src, id: crypto.randomUUID(), analysed: true }
      setCapturedImages(prev => [...prev, newImage])
      
      try {
        const base64 = src.split(',')[1]
        const mimeType = src.split(';')[0].split(':')[1]
        const result = await analyzeImage(base64, mimeType)
        
        const newResult = { imageId: newImage.id, ...result }
        setImageAnalysisResults(prev => [...prev, newResult])
        
        if (!newResult.error) {
          setMergedImageEvidence(prev => ({
            ...prev,
            no_clot: prev.no_clot || newResult.bn_evidence?.no_clot,
            bone_exposure: prev.bone_exposure || newResult.bn_evidence?.bone_exposure,
            inflammation: prev.inflammation || newResult.bn_evidence?.inflammation,
            debris: prev.debris || newResult.bn_evidence?.debris,
          }))
        }
      } catch (err) {
        console.error('Analysis error:', err)
        setImageAnalysisResults(prev => [...prev, { imageId: newImage.id, error: err.message }])
      } finally {
        setIsAnalyzingUpload(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const toggleEvidence = (key) => {
    setEvidence(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSaveAssessment = async () => {
    if (!user) return
    setSaving(true)

    const assessmentData = {
      patient_id: patientId,
      created_by: user.id,
      evidence_snapshot: JSON.stringify({ ...evidence, ...mergedImageEvidence }),
      risk_score: riskResult?.riskScore ?? 0,
      risk_level: riskResult?.riskLevel ?? 'LOW',
      risk_probability: riskResult?.probability ?? 0,
      extraction_site: extraFields.extraction_site,
      tooth_number: extraFields.tooth_number,
      extraction_type: extraFields.extraction_type,
      notes: extraFields.notes,
      recommendations: JSON.stringify(riskResult?.recommendations ?? []),
      image_count: capturedImages.length,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await assessments.create(assessmentData)
    setSaving(false)

    if (!error && data) {
      navigate(`/assessment/${patientId}/results/${data.id}`, {
        state: { riskResult, patient, assessment: data, images: capturedImages, analysisResults: imageAnalysisResults }
      })
    }
  }

  // Skip-patient mode (select patient first)
  if (!patientId) {
    return <SelectPatient onSelect={(id) => navigate(`/assessment/${id}`)} />
  }

  return (
    <div className="min-h-dvh bg-surface pb-28 pt-16">
      <Header title="Risk Assessment" />

      <main className="px-4 py-5 max-w-lg mx-auto animate-fade-in space-y-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Patient banner */}
        {patient && (
          <div className="glass-light rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/30 flex items-center justify-center text-primary font-bold">
              {patient.full_name?.[0]}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{patient.full_name}</div>
              <div className="text-xs text-slate-400">Post-extraction risk assessment</div>
            </div>
          </div>
        )}

        {/* Live risk meter */}
        {riskResult && (
          <div className="card flex flex-col items-center">
            <div className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <Activity size={15} className="text-primary" />
              Live Risk Calculation
            </div>
            <RiskMeter score={riskResult.riskScore} level={riskResult.riskLevel} size={220} />
            <div className="mt-3 text-xs text-slate-500 text-center px-4">
              {riskResult.fusionNote}
            </div>
            {imageAnalysisResults.length > 0 && (
              <div className="mt-3 w-full bg-surface-border/30 border border-surface-border rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                  <Camera size={13} />
                  AI Image Analysis Completed
                </div>
                {imageAnalysisResults.map((r, i) => (
                  <div key={i} className="text-xs text-slate-400 mt-1">
                    {r.error ? (
                      <span className="text-risk-high">Error: {r.error}</span>
                    ) : (
                      <>
                        <span className="text-white font-medium">AI Notes:</span> {r.clinical_notes || 'No specific findings.'}
                        <div className="mt-1">
                          Risk Score: <span className="text-white">{r.image_risk_score}</span> | 
                          Confidence: <span className="text-white">{Math.round((r.confidence || 0) * 100)}%</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clinical fields */}
        <div className="card space-y-4">
          <div className="section-title">Extraction Details</div>
          <div>
            <label className="label">Extraction Site</label>
            <div className="flex gap-2 flex-wrap">
              {['Upper Left', 'Upper Right', 'Lower Left', 'Lower Right'].map(s => (
                <button key={s} type="button"
                  onClick={() => setExtraFields(f => ({ ...f, extraction_site: s }))}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    extraFields.extraction_site === s
                      ? 'bg-primary border-primary text-white'
                      : 'border-surface-border text-slate-400'
                  }`}
                >{s}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tooth Number</label>
              <input className="input-field" placeholder="e.g. 38" value={extraFields.tooth_number}
                onChange={e => setExtraFields(f => ({ ...f, tooth_number: e.target.value }))} />
            </div>
            <div>
              <label className="label">Extraction Type</label>
              <select className="input-field" value={extraFields.extraction_type}
                onChange={e => setExtraFields(f => ({ ...f, extraction_type: e.target.value }))}>
                <option value="simple">Simple</option>
                <option value="surgical">Surgical</option>
                <option value="impacted">Impacted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bayesian risk factors */}
        {Object.entries(cptGroups)
          .filter(([cat]) => cat !== 'Image Analysis')
          .map(([category, nodes]) => (
            <div key={category} className="card">
              <div className="section-title">{category}</div>
              <div className="space-y-2">
                {nodes.map(node => {
                  const active = evidence[node.key] === true
                  return (
                    <button key={node.key} type="button" onClick={() => toggleEvidence(node.key)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                        active
                          ? node.OR >= 5 ? 'bg-risk-high/10 border-risk-high/40' :
                            node.OR >= 3 ? 'bg-risk-medium/10 border-risk-medium/40' :
                            'bg-primary/10 border-primary/40'
                          : 'border-surface-border hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                        active ? (node.OR >= 5 ? 'bg-risk-high border-risk-high' : node.OR >= 3 ? 'bg-risk-medium border-risk-medium' : 'bg-primary border-primary') : 'border-slate-500'
                      }`}>
                        {active && <svg viewBox="0 0 10 8" className="w-3 h-2"><path d="M1 4l3 3L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{node.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{node.description}</div>
                      </div>
                      {node.OR >= 3 && (
                        <div className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                          node.OR >= 5 ? 'bg-risk-high/20 text-risk-high' : 'bg-risk-medium/20 text-risk-medium'
                        }`}>OR {node.OR}×</div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        }

        {/* Image capture */}
        <div className="card">
          <div className="section-title flex items-center gap-2">
            <Camera size={16} className="text-primary" />
            Intraoral Images
          </div>
          <button
            id="btn-open-camera"
            onClick={() => navigate(`/assessment/${patientId}/camera`, { state: { evidence, extraFields } })}
            className="w-full flex items-center justify-between p-4 border border-dashed border-primary/40 rounded-xl hover:border-primary transition-colors"
          >
            <div className="flex items-center gap-3 text-slate-300">
              <Camera size={22} className="text-primary" />
              <div>
                <div className="text-sm font-semibold">Capture Intraoral Images</div>
                <div className="text-xs text-slate-500">{capturedImages.length > 0 ? `${capturedImages.length} image(s) captured` : 'Required for AI analysis'}</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-500" />
          </button>
          
          <label className="w-full mt-2 flex items-center justify-center p-3 bg-surface-border/30 rounded-xl hover:bg-surface-border/50 cursor-pointer transition-colors text-sm text-slate-300 font-semibold">
            {isAnalyzingUpload ? (
              <><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" /> Analyzing Upload...</>
            ) : (
              <>Upload from files
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleDirectUpload}
                  disabled={isAnalyzingUpload}
                />
              </>
            )}
          </label>

          {riskResult?.riskLevel === 'HIGH' && (
            <div className="mt-3 flex items-center gap-2 bg-risk-high/10 border border-risk-high/30 px-4 py-3 rounded-xl">
              <AlertTriangle size={16} className="text-risk-high flex-shrink-0" />
              <p className="text-xs text-risk-high">High risk detected. Image capture strongly recommended.</p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card">
          <label className="label text-base font-semibold text-white mb-2">Clinical Notes</label>
          <textarea className="input-field min-h-[90px] resize-none" placeholder="Additional observations, patient condition, contraindications…"
            value={extraFields.notes} onChange={e => setExtraFields(f => ({ ...f, notes: e.target.value }))} />
        </div>

        {/* Save */}
        <button
          id="btn-save-assessment"
          onClick={handleSaveAssessment}
          disabled={saving}
          className="w-full btn-primary py-4 text-base flex items-center justify-center gap-2"
        >
          {saving
            ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
            : <>Calculate & Save Assessment <ChevronRight size={18} /></>
          }
        </button>
      </main>
    </div>
  )
}

function SelectPatient({ onSelect }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data } = usePatients(user?.id)

  return (
    <div className="min-h-dvh bg-surface pb-24 pt-16">
      <Header title="Select Patient" />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold text-white">Select a Patient</h1>
        <input className="input-field" placeholder="Search patients…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="space-y-2">
          {(data ?? []).filter(p => p.full_name?.toLowerCase().includes(search.toLowerCase())).map(p => (
            <button key={p.id} onClick={() => onSelect(p.id)}
              className="w-full card flex items-center gap-3 hover:border-primary/50 text-left">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold">
                {p.full_name?.[0]}
              </div>
              <span className="font-medium text-white">{p.full_name}</span>
              <ChevronRight size={16} className="text-slate-600 ml-auto" />
            </button>
          ))}
        </div>
        <button onClick={() => navigate('/patients/new')} className="w-full btn-primary">
          + Add New Patient
        </button>
      </main>
      <BottomNav />
    </div>
  )
}
