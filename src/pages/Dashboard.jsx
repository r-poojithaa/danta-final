import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, AlertTriangle, ClipboardList, TrendingUp, Plus, ChevronRight, Activity } from 'lucide-react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import Header from '../components/layout/Header.jsx'
import BottomNav from '../components/layout/BottomNav.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { stats, assessments } from '../services/supabase.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const RISK_COLOR = { HIGH: '#EF4444', MEDIUM: '#F59E0B', LOW: '#10B981' }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dashStats, setDashStats] = useState({ totalPatients: 0, totalAssessments: 0, highRisk: 0, medRisk: 0, lowRisk: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      stats.getDashboard(user.id),
      assessments.getRecent(user.id, 5),
    ]).then(([s, r]) => {
      setDashStats(s)
      setRecent(r.data ?? [])
      setLoading(false)
    })
  }, [user])

  const chartData = {
    labels: ['High Risk', 'Medium Risk', 'Low Risk'],
    datasets: [{
      data: [dashStats.highRisk, dashStats.medRisk, dashStats.lowRisk],
      backgroundColor: ['#EF4444', '#F59E0B', '#10B981'],
      borderColor: ['#1E293B'],
      borderWidth: 3,
      hoverOffset: 8,
    }],
  }

  const chartOptions = {
    cutout: '70%',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}` } } },
    animation: { animateRotate: true, duration: 1200 },
  }

  const statCards = [
    { label: 'Total Patients', value: dashStats.totalPatients, icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'High Risk', value: dashStats.highRisk, icon: AlertTriangle, color: 'text-risk-high', bg: 'bg-risk-high/10' },
    { label: 'Assessments', value: dashStats.totalAssessments, icon: ClipboardList, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Medium Risk', value: dashStats.medRisk, icon: TrendingUp, color: 'text-risk-medium', bg: 'bg-risk-medium/10' },
  ]

  return (
    <div className="min-h-dvh bg-surface pb-24 pt-16">
      <Header title="Dashboard" />

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6 animate-fade-in">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            Good {hour()}, Doctor
          </h1>
          <p className="text-slate-400 text-sm mt-1">Here's your clinical overview</p>
        </div>

        {/* Quick action */}
        <button
          id="btn-new-assessment"
          onClick={() => navigate('/assessment')}
          className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-base"
        >
          <Plus size={20} />
          New Risk Assessment
        </button>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={20} className={color} />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white">{loading ? '—' : value}</div>
                <div className="text-xs text-slate-400">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Risk distribution chart */}
        {dashStats.totalAssessments > 0 && (
          <div className="card">
            <div className="section-title flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              Risk Distribution
            </div>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 flex-shrink-0">
                <Doughnut data={chartData} options={chartOptions} />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {[
                  { label: 'High Risk', count: dashStats.highRisk, color: '#EF4444' },
                  { label: 'Medium Risk', count: dashStats.medRisk, color: '#F59E0B' },
                  { label: 'Low Risk', count: dashStats.lowRisk, color: '#10B981' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-xs text-slate-400 flex-1">{label}</span>
                    <span className="text-sm font-bold text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent assessments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title mb-0">Recent Assessments</div>
            <button onClick={() => navigate('/patients')} className="text-xs text-primary hover:text-primary-light">View all</button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-surface-border rounded-xl animate-pulse" />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList size={36} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No assessments yet</p>
              <p className="text-slate-500 text-xs mt-1">Start by adding a patient</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map(a => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/patients/${a.patient_id}`)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-surface-border/50 rounded-xl transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {a.patients?.full_name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{a.patients?.full_name ?? 'Unknown'}</div>
                    <div className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <span className={`risk-badge-${a.risk_level?.toLowerCase() ?? 'low'}`}>
                      {a.risk_level ?? 'N/A'}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-slate-600" />
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}

function hour() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}
