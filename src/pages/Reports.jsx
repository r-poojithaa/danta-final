import { useState, useEffect } from 'react'
import { BarChart2, Download, Calendar, Filter } from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import Header from '../components/layout/Header.jsx'
import BottomNav from '../components/layout/BottomNav.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { assessments } from '../services/supabase.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function Reports() {
  const { user } = useAuth()
  const [allAssessments, setAllAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('30')

  useEffect(() => {
    if (!user) return
    assessments.getRecent(user.id, 100).then(({ data }) => {
      setAllAssessments(data ?? [])
      setLoading(false)
    })
  }, [user])

  const days = parseInt(range)
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const filtered = allAssessments.filter(a => new Date(a.created_at) >= cutoff)

  const high = filtered.filter(a => a.risk_level === 'HIGH').length
  const med = filtered.filter(a => a.risk_level === 'MEDIUM').length
  const low = filtered.filter(a => a.risk_level === 'LOW').length

  // Group by date for trend
  const byDate = {}
  filtered.forEach(a => {
    const d = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!byDate[d]) byDate[d] = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    byDate[d][a.risk_level] = (byDate[d][a.risk_level] ?? 0) + 1
  })
  const dateLabels = Object.keys(byDate).slice(-14)

  const barData = {
    labels: dateLabels,
    datasets: [
      { label: 'High', data: dateLabels.map(d => byDate[d]?.HIGH ?? 0), backgroundColor: '#EF4444', borderRadius: 4 },
      { label: 'Medium', data: dateLabels.map(d => byDate[d]?.MEDIUM ?? 0), backgroundColor: '#F59E0B', borderRadius: 4 },
      { label: 'Low', data: dateLabels.map(d => byDate[d]?.LOW ?? 0), backgroundColor: '#10B981', borderRadius: 4 },
    ],
  }

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#94A3B8', font: { size: 11 } } },
      tooltip: {},
    },
    scales: {
      x: { stacked: true, ticks: { color: '#64748B', font: { size: 10 } }, grid: { display: false } },
      y: { stacked: true, ticks: { color: '#64748B', font: { size: 10 } }, grid: { color: '#1E293B' } },
    },
  }

  const avgScore = filtered.length
    ? Math.round(filtered.reduce((s, a) => s + (a.risk_score ?? 0), 0) / filtered.length)
    : 0

  const exportCSV = () => {
    const rows = [
      ['Patient', 'Date', 'Risk Level', 'Risk Score', 'Extraction Site'],
      ...filtered.map(a => [
        a.patients?.full_name ?? '',
        new Date(a.created_at).toLocaleDateString(),
        a.risk_level ?? '',
        a.risk_score ?? '',
        a.extraction_site ?? '',
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'danta-report.csv'; a.click()
  }

  return (
    <div className="min-h-dvh bg-surface pb-24 pt-16">
      <Header title="Reports" />

      <main className="px-4 py-6 max-w-lg mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-white">Analytics</h1>
          <button onClick={exportCSV} className="btn-ghost border border-surface-border rounded-xl px-3 py-2 flex items-center gap-1.5 text-xs">
            <Download size={14} />CSV
          </button>
        </div>

        {/* Date range filter */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <div className="flex gap-2">
            {[
              { label: '7d', value: '7' },
              { label: '30d', value: '30' },
              { label: '90d', value: '90' },
              { label: 'All', value: '3650' },
            ].map(r => (
              <button key={r.value} onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  range === r.value ? 'bg-primary border-primary text-white' : 'border-surface-border text-slate-400'
                }`}
              >{r.label}</button>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: filtered.length, color: 'text-white' },
            { label: 'High', value: high, color: 'text-risk-high' },
            { label: 'Med', value: med, color: 'text-risk-medium' },
            { label: 'Low', value: low, color: 'text-risk-low' },
          ].map(s => (
            <div key={s.label} className="card text-center py-3">
              <div className={`text-2xl font-extrabold ${s.color}`}>{loading ? '—' : s.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Avg risk score */}
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
            <BarChart2 size={26} className="text-primary" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">{avgScore}</div>
            <div className="text-sm text-slate-400">Average Risk Score</div>
          </div>
          <div className="ml-auto text-xs text-slate-500">
            {filtered.length} assessments<br />in {range === '3650' ? 'all time' : `last ${range} days`}
          </div>
        </div>

        {/* Bar chart */}
        {dateLabels.length > 0 && (
          <div className="card">
            <div className="section-title">Risk Trends</div>
            <Bar data={barData} options={barOptions} />
          </div>
        )}

        {/* Assessment table */}
        <div className="card">
          <div className="section-title">Assessment Log</div>
          {filtered.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No data in selected range</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left text-slate-400 py-2 px-2">Patient</th>
                    <th className="text-left text-slate-400 py-2 px-2">Date</th>
                    <th className="text-right text-slate-400 py-2 px-2">Score</th>
                    <th className="text-right text-slate-400 py-2 px-2">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 20).map(a => (
                    <tr key={a.id} className="border-b border-surface-border/50 hover:bg-surface-border/20">
                      <td className="py-2 px-2 text-slate-300 truncate max-w-[100px]">{a.patients?.full_name ?? '—'}</td>
                      <td className="py-2 px-2 text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-2 text-right font-bold text-white">{a.risk_score ?? '—'}</td>
                      <td className="py-2 px-2 text-right">
                        <span className={`risk-badge-${a.risk_level?.toLowerCase() ?? 'low'}`}>{a.risk_level}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
