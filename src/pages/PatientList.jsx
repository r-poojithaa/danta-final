import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Filter, ChevronRight, UserCircle } from 'lucide-react'
import Header from '../components/layout/Header.jsx'
import BottomNav from '../components/layout/BottomNav.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { usePatients } from '../hooks/usePatients.js'

const RISK_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 }

export default function PatientList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: patients, loading } = usePatients(user?.id)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('date')
  const [filterRisk, setFilterRisk] = useState('ALL')

  const filtered = patients
    .filter(p => {
      const q = search.toLowerCase()
      return p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
    })
    .filter(p => filterRisk === 'ALL' || p.latest_risk_level === filterRisk)
    .sort((a, b) => {
      if (sort === 'risk') return (RISK_ORDER[a.latest_risk_level] ?? 3) - (RISK_ORDER[b.latest_risk_level] ?? 3)
      if (sort === 'name') return a.full_name?.localeCompare(b.full_name)
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const riskFilters = ['ALL', 'HIGH', 'MEDIUM', 'LOW']

  return (
    <div className="min-h-dvh bg-surface pb-24 pt-16">
      <Header title="Patients" />

      <main className="px-4 py-6 max-w-lg mx-auto space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-white">Patient Records</h1>
          <button
            id="btn-add-patient"
            onClick={() => navigate('/patients/new')}
            className="btn-primary py-2.5 px-4 text-sm flex items-center gap-1.5"
          >
            <Plus size={16} />
            New
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="input-search-patients"
            className="input-field pl-10"
            placeholder="Search patients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Filter size={14} className="text-slate-500 flex-shrink-0" />
          {riskFilters.map(r => (
            <button
              key={r}
              onClick={() => setFilterRisk(r)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filterRisk === r
                  ? 'bg-primary border-primary text-white'
                  : 'border-surface-border text-slate-400 hover:border-slate-500'
              }`}
            >
              {r}
            </button>
          ))}
          <div className="ml-auto flex-shrink-0">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="bg-surface-card border border-surface-border text-slate-300 text-xs rounded-lg px-2 py-1.5"
            >
              <option value="date">Sort: Date</option>
              <option value="name">Sort: Name</option>
              <option value="risk">Sort: Risk</option>
            </select>
          </div>
        </div>

        {/* Patient list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-20 bg-surface-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-14">
            <UserCircle size={48} className="text-slate-600 mx-auto mb-3" />
            <p className="text-white font-semibold">No patients found</p>
            <p className="text-slate-400 text-sm mt-1">
              {search ? 'Try a different search term' : 'Add your first patient to get started'}
            </p>
            {!search && (
              <button onClick={() => navigate('/patients/new')} className="btn-primary mt-4 inline-flex items-center gap-2">
                <Plus size={16} /> Add Patient
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/patients/${p.id}`)}
                className="w-full card flex items-center gap-3 hover:border-primary/50 transition-all duration-200 active:scale-[0.98] text-left py-3.5"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/40 to-accent/30 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {p.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{p.full_name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {p.date_of_birth ? `${age(p.date_of_birth)} yrs` : ''} · Last: {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : 'Never'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {p.latest_risk_level && (
                    <span className={`risk-badge-${p.latest_risk_level.toLowerCase()}`}>
                      {p.latest_risk_level}
                    </span>
                  )}
                  <ChevronRight size={16} className="text-slate-600" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

function age(dob) {
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}
