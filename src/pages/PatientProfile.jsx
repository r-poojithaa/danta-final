import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ScanLine, Clock, TrendingUp, ImageIcon, Pencil, Plus } from 'lucide-react'
import Header from '../components/layout/Header.jsx'
import BottomNav from '../components/layout/BottomNav.jsx'
import { patients as supabasePatients, assessments } from '../services/supabase.js'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

export default function PatientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [assessList, setAssessList] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    Promise.all([
      supabasePatients.getById(id),
      assessments.getForPatient(id),
    ]).then(([p, a]) => {
      setPatient(p.data)
      setAssessList(a.data ?? [])
      setLoading(false)
    })
  }, [id])

  if (loading) return (
    <div className="min-h-dvh bg-surface flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!patient) return (
    <div className="min-h-dvh bg-surface flex items-center justify-center">
      <p className="text-slate-400">Patient not found</p>
    </div>
  )

  const latestAssessment = assessList[0]
  const riskHistory = assessList.slice().reverse()
  const chartData = {
    labels: riskHistory.map(a => new Date(a.created_at).toLocaleDateString()),
    datasets: [{
      data: riskHistory.map(a => a.risk_score ?? 0),
      borderColor: '#2563EB',
      backgroundColor: 'rgba(37,99,235,0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: riskHistory.map(a =>
        a.risk_level === 'HIGH' ? '#EF4444' : a.risk_level === 'MEDIUM' ? '#F59E0B' : '#10B981'
      ),
      pointRadius: 5,
    }],
  }
  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` Risk: ${c.raw}` } } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#1E293B' }, ticks: { color: '#64748B', font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 10 } } },
    },
  }

  const medConditions = patient.medical_conditions?.split(',').filter(Boolean) ?? []
  const patientAge = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  return (
    <div className="min-h-dvh bg-surface pb-24 pt-16">
      <Header title="Patient Profile" />
      <main className="px-4 py-5 max-w-lg mx-auto animate-fade-in space-y-4">

        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/patients')} className="flex items-center gap-1 text-slate-400 hover:text-white">
            <ArrowLeft size={18} /> Back
          </button>
          <button onClick={() => navigate(`/patients/${id}/edit`)} className="btn-ghost flex items-center gap-1 text-xs">
            <Pencil size={14} /> Edit
          </button>
        </div>

        {/* Patient card */}
        <div className="card flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/50 to-accent/30 flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
            {patient.full_name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-white truncate">{patient.full_name}</h1>
            <div className="text-sm text-slate-400 mt-0.5">
              {patientAge ? `${patientAge} yrs` : ''}{patient.gender ? ` · ${patient.gender}` : ''}
            </div>
            {patient.phone && <div className="text-xs text-slate-500 mt-0.5">{patient.phone}</div>}
          </div>
          {latestAssessment?.risk_level && (
            <span className={`risk-badge-${latestAssessment.risk_level.toLowerCase()} self-start`}>
              {latestAssessment.risk_level}
            </span>
          )}
        </div>

        {/* New assessment button */}
        <button
          id="btn-new-assessment-patient"
          onClick={() => navigate(`/assessment/${id}`)}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          <ScanLine size={18} />
          Start New Risk Assessment
        </button>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-card rounded-xl p-1">
          {['overview', 'history', 'images'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                tab === t ? 'bg-primary text-white' : 'text-slate-400'
              }`}
            >{t}</button>
          ))}
        </div>

        {/* Tab: Overview */}
        {tab === 'overview' && (
          <div className="space-y-3 animate-fade-in">
            {medConditions.length > 0 && (
              <div className="card">
                <div className="section-title">Medical Conditions</div>
                <div className="flex flex-wrap gap-2">
                  {medConditions.map(c => (
                    <span key={c} className="px-3 py-1 bg-surface-border rounded-full text-xs text-slate-300">{c}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="card">
              <div className="section-title">Risk Factors</div>
              <div className="space-y-2">
                {[
                  { label: 'Smoking', value: patient.smoking_status !== 'never', detail: patient.smoking_status },
                  { label: 'OCP Use', value: patient.ocp_use, detail: 'Elevated risk' },
                  { label: 'Prior Dry Socket', value: patient.previous_dry_socket, detail: 'High indicator' },
                  { label: 'Alcohol', value: patient.drinks_alcohol, detail: 'Moderate factor' },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${f.value ? 'bg-risk-high' : 'bg-risk-low'}`} />
                    <span className="text-sm text-slate-300 flex-1">{f.label}</span>
                    <span className="text-xs text-slate-500">{f.value ? f.detail : 'None'}</span>
                  </div>
                ))}
              </div>
            </div>
            {patient.current_medications && (
              <div className="card">
                <div className="section-title">Current Medications</div>
                <p className="text-sm text-slate-300">{patient.current_medications}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: History */}
        {tab === 'history' && (
          <div className="space-y-3 animate-fade-in">
            {riskHistory.length > 1 && (
              <div className="card">
                <div className="section-title flex items-center gap-2"><TrendingUp size={16} className="text-primary" />Risk Trend</div>
                <Line data={chartData} options={chartOptions} />
              </div>
            )}
            {assessList.length === 0 ? (
              <div className="card text-center py-10">
                <Clock size={36} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No assessments yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assessList.map(a => (
                  <button key={a.id} onClick={() => navigate(`/assessment/${id}/results/${a.id}`)}
                    className="w-full card flex items-center gap-3 hover:border-primary/50 transition-all text-left">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${
                      a.risk_level === 'HIGH' ? 'bg-risk-high/20 text-risk-high' :
                      a.risk_level === 'MEDIUM' ? 'bg-risk-medium/20 text-risk-medium' :
                      'bg-risk-low/20 text-risk-low'
                    }`}>{a.risk_score ?? '?'}</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">
                        {new Date(a.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-slate-400">{a.extraction_site || 'Assessment'}</div>
                    </div>
                    <span className={`risk-badge-${a.risk_level?.toLowerCase() ?? 'low'}`}>{a.risk_level}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Images */}
        {tab === 'images' && (
          <div className="card animate-fade-in">
            <div className="section-title flex items-center gap-2"><ImageIcon size={16} className="text-primary" />Image Gallery</div>
            <div className="text-center py-10">
              <ImageIcon size={36} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Images are attached to each assessment</p>
              <button onClick={() => navigate(`/assessment/${id}`)} className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
                <Plus size={15} /> New Assessment
              </button>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
