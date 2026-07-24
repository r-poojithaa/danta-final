import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, User, Heart, Cigarette, Pill, Check } from 'lucide-react'
import Header from '../components/layout/Header.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { usePatients } from '../hooks/usePatients.js'

const STEPS = ['Personal Info', 'Medical History', 'Lifestyle & Habits', 'Review']

export default function NewPatient() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { createPatient } = usePatients(user?.id)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '', date_of_birth: '', gender: '', phone: '', email: '',
    medical_conditions: [], current_medications: '', allergies: '',
    smoking_status: 'never', drinks_alcohol: false, ocp_use: false,
    previous_dry_socket: false, previous_dental_complications: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggle = (k) => setForm(f => ({ ...f, [k]: !f[k] }))
  const toggleCondition = (c) => setForm(f => ({
    ...f,
    medical_conditions: f.medical_conditions.includes(c)
      ? f.medical_conditions.filter(x => x !== c)
      : [...f.medical_conditions, c],
  }))

  const handleSave = async () => {
    setSaving(true)
    const { data, error } = await createPatient({
      ...form,
      medical_conditions: form.medical_conditions.join(','),
      created_at: new Date().toISOString(),
    })
    setSaving(false)
    if (!error && data) navigate(`/patients/${data.id}`)
  }

  const MEDICAL_CONDITIONS = ['Diabetes', 'Hypertension', 'Heart Disease', 'Osteoporosis', 'Autoimmune Disorder', 'Cancer / Chemotherapy', 'Blood Disorder', 'Immunocompromised']

  return (
    <div className="min-h-dvh bg-surface pb-10 pt-16">
      <Header title="New Patient" />

      <main className="px-4 py-6 max-w-lg mx-auto animate-fade-in">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">Step {step + 1} of {STEPS.length}</span>
            <span className="text-xs text-slate-400">{STEPS[step]}</span>
          </div>
          <div className="h-1.5 bg-surface-card rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="card space-y-5">
          {/* ─── Step 0: Personal Info ─── */}
          {step === 0 && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-primary" />
                <h2 className="text-lg font-bold text-white">Personal Information</h2>
              </div>
              {[
                { label: 'Full Name *', key: 'full_name', type: 'text', placeholder: 'Dr. / Mr. / Ms. Full Name' },
                { label: 'Date of Birth *', key: 'date_of_birth', type: 'date', placeholder: '' },
                { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '+91 00000 00000' },
                { label: 'Email Address', key: 'email', type: 'email', placeholder: 'patient@email.com' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input type={type} className="input-field" placeholder={placeholder}
                    value={form[key]} onChange={e => set(key, e.target.value)} />
                </div>
              ))}
              <div>
                <label className="label">Gender</label>
                <div className="flex gap-2">
                  {['Male', 'Female', 'Other'].map(g => (
                    <button key={g} type="button"
                      onClick={() => set('gender', g)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        form.gender === g ? 'bg-primary border-primary text-white' : 'border-surface-border text-slate-400 hover:border-slate-500'
                      }`}
                    >{g}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─── Step 1: Medical History ─── */}
          {step === 1 && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Heart size={18} className="text-risk-high" />
                <h2 className="text-lg font-bold text-white">Medical History</h2>
              </div>
              <div>
                <label className="label">Medical Conditions</label>
                <div className="grid grid-cols-2 gap-2">
                  {MEDICAL_CONDITIONS.map(c => (
                    <button key={c} type="button"
                      onClick={() => toggleCondition(c)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs text-left transition-all ${
                        form.medical_conditions.includes(c)
                          ? 'bg-primary/20 border-primary text-white'
                          : 'border-surface-border text-slate-400'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        form.medical_conditions.includes(c) ? 'bg-primary border-primary' : 'border-slate-500'
                      }`}>
                        {form.medical_conditions.includes(c) && <Check size={10} className="text-white" />}
                      </div>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Current Medications</label>
                <textarea className="input-field min-h-[80px] resize-none" placeholder="List current medications and dosages…"
                  value={form.current_medications} onChange={e => set('current_medications', e.target.value)} />
              </div>
              <div>
                <label className="label">Allergies</label>
                <input type="text" className="input-field" placeholder="Drug / material allergies…"
                  value={form.allergies} onChange={e => set('allergies', e.target.value)} />
              </div>
              <Toggle label="Previous Dry Socket History" sublabel="High-risk indicator"
                value={form.previous_dry_socket} onToggle={() => toggle('previous_dry_socket')} danger />
            </>
          )}

          {/* ─── Step 2: Lifestyle ─── */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Cigarette size={18} className="text-risk-medium" />
                <h2 className="text-lg font-bold text-white">Lifestyle & Habits</h2>
              </div>
              <div>
                <label className="label">Smoking Status</label>
                <div className="flex flex-col gap-2">
                  {[
                    { value: 'never', label: 'Non-smoker' },
                    { value: 'former', label: 'Former smoker' },
                    { value: 'current', label: 'Current smoker' },
                    { value: 'heavy', label: 'Heavy smoker (>10/day)' },
                  ].map(o => (
                    <button key={o.value} type="button" onClick={() => set('smoking_status', o.value)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all ${
                        form.smoking_status === o.value
                          ? 'bg-primary/20 border-primary text-white'
                          : 'border-surface-border text-slate-400'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        form.smoking_status === o.value ? 'border-primary' : 'border-slate-500'
                      }`}>
                        {form.smoking_status === o.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle label="Regular Alcohol Consumption" sublabel="May affect clot formation"
                value={form.drinks_alcohol} onToggle={() => toggle('drinks_alcohol')} />
              <Toggle label="Oral Contraceptive Pill (OCP)" sublabel="Elevated oestrogen risk factor"
                value={form.ocp_use} onToggle={() => toggle('ocp_use')} danger />
              <div>
                <label className="label">Previous Dental Complications</label>
                <textarea className="input-field min-h-[70px] resize-none"
                  placeholder="Any previous extraction complications, adverse reactions…"
                  value={form.previous_dental_complications}
                  onChange={e => set('previous_dental_complications', e.target.value)} />
              </div>
            </>
          )}

          {/* ─── Step 3: Review ─── */}
          {step === 3 && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Check size={18} className="text-risk-low" />
                <h2 className="text-lg font-bold text-white">Review & Save</h2>
              </div>
              <ReviewRow label="Full Name" value={form.full_name || '—'} />
              <ReviewRow label="Date of Birth" value={form.date_of_birth || '—'} />
              <ReviewRow label="Gender" value={form.gender || '—'} />
              <ReviewRow label="Phone" value={form.phone || '—'} />
              <ReviewRow label="Conditions" value={form.medical_conditions.join(', ') || 'None'} />
              <ReviewRow label="Smoking" value={form.smoking_status} />
              <ReviewRow label="OCP Use" value={form.ocp_use ? 'Yes ⚠️' : 'No'} />
              <ReviewRow label="Prior Dry Socket" value={form.previous_dry_socket ? 'Yes 🔴' : 'No'} />
            </>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-5">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn-ghost flex items-center gap-1 border border-surface-border rounded-xl px-4 py-3">
              <ChevronLeft size={18} /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} className="btn-primary flex-1 flex items-center justify-center gap-1">
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><Check size={18} />Save Patient</>}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

function Toggle({ label, sublabel, value, onToggle, danger }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
      value ? (danger ? 'bg-risk-high/10 border-risk-high/40' : 'bg-primary/10 border-primary/40') : 'border-surface-border'
    }`}>
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        {sublabel && <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
          value ? (danger ? 'bg-risk-high' : 'bg-primary') : 'bg-surface-border'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${value ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  )
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-medium text-white text-right max-w-[60%]">{value}</span>
    </div>
  )
}
