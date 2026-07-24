import { useState } from 'react'
import { Search, ChevronDown, ChevronUp, BookOpen, Video, Mail, ExternalLink } from 'lucide-react'
import Header from '../components/layout/Header.jsx'
import BottomNav from '../components/layout/BottomNav.jsx'

const FAQS = [
  {
    q: 'What is dry socket (alveolar osteitis)?',
    a: 'Dry socket is a painful dental condition where the blood clot at a tooth extraction site is dislodged or dissolves before the wound heals. It exposes underlying bone and nerves, causing severe pain 2–5 days after extraction.',
  },
  {
    q: 'How does the Bayesian Network calculate risk?',
    a: 'Danta uses a Noisy-OR Bayesian Network trained on clinical literature with published Odds Ratios for each risk factor. It combines P(DrySocket | factor) for all active factors to compute a unified posterior probability.',
  },
  {
    q: 'How does image analysis work?',
    a: 'Captured intraoral images are sent to OpenAI GPT-4o Vision, which detects clot presence, bone exposure, inflammation level, and debris. These features are converted to BN evidence and fused with clinical factors (60% clinical + 40% image).',
  },
  {
    q: 'What does the risk score mean?',
    a: 'The score (0–100) represents the posterior probability of dry socket × 100. LOW (0–34): Standard post-op care. MEDIUM (35–64): Enhanced monitoring + preventive measures. HIGH (65–100): Immediate prophylactic intervention recommended.',
  },
  {
    q: 'Does the app work offline?',
    a: 'Yes. Danta is a PWA that stores patient data and assessments locally in IndexedDB. When reconnected, data syncs automatically to Supabase. Image capture and risk calculation both work offline. GPT-4o analysis requires internet.',
  },
  {
    q: 'Is patient data HIPAA compliant?',
    a: 'All data is encrypted at rest and in transit via Supabase\'s AES-256 encryption and TLS. Row-level security ensures clinicians only access their own patient records. No data is shared with third parties except for GPT-4o image analysis.',
  },
  {
    q: 'Can I install this as an app?',
    a: 'Yes. Danta is a Progressive Web App (PWA). On mobile, tap "Add to Home Screen" in your browser. On desktop, click the install icon in the address bar. It works offline and feels like a native app.',
  },
  {
    q: 'How do I add the OpenAI key?',
    a: 'Set VITE_OPENAI_API_KEY in your .env file. Without it, image analysis falls back to a heuristic placeholder and only the Bayesian Network risk is used.',
  },
]

export default function Help() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(null)

  const filtered = FAQS.filter(f =>
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-dvh bg-surface pb-24 pt-16">
      <Header title="Help" />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-5 animate-fade-in">
        <h1 className="text-2xl font-extrabold text-white">Help & Documentation</h1>

        {/* Search */}
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input-field pl-10" placeholder="Search help articles…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: BookOpen, label: 'User Manual', color: 'text-primary' },
            { icon: Video, label: 'Tutorials', color: 'text-accent' },
            { icon: Mail, label: 'Support', color: 'text-risk-low' },
          ].map(({ icon: Icon, label, color }) => (
            <button 
              key={label} 
              onClick={() => {
                if (label === 'Support') window.location.href = 'mailto:support@danta.com'
                else alert(`${label} is currently in development and will be available in v1.1.`)
              }}
              className="card flex flex-col items-center gap-2 py-4 hover:border-primary/50 transition-all"
            >
              <Icon size={22} className={color} />
              <span className="text-xs font-semibold text-slate-300">{label}</span>
            </button>
          ))}
        </div>

        {/* FAQ */}
        <div className="space-y-2">
          <div className="text-sm font-bold text-slate-300 px-1">Frequently Asked Questions</div>
          {filtered.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-slate-400">No results for "{search}"</p>
            </div>
          ) : (
            filtered.map((faq, i) => (
              <div key={i} className="card overflow-hidden p-0">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-4 text-left gap-3"
                >
                  <span className="text-sm font-medium text-white">{faq.q}</span>
                  {open === i
                    ? <ChevronUp size={16} className="text-primary flex-shrink-0" />
                    : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />
                  }
                </button>
                {open === i && (
                  <div className="px-4 pb-4 text-sm text-slate-300 border-t border-surface-border pt-3 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Clinical references */}
        <div className="card space-y-2">
          <div className="section-title">Clinical References</div>
          {[
            'Nusair & Younis (2007) – Dry socket incidence, Quintessence Int.',
            'Blum (1992) – Risk factors review, Br J Oral Maxillofac Surg',
            'Birn (1973) – Fibrinolytic theory, Int J Oral Surg',
            'Kolokythas et al. (2010) – Systematic review, J Oral Maxillofac Surg',
          ].map((ref, i) => (
            <div key={i} className="flex items-start gap-2">
              <ExternalLink size={13} className="text-primary mt-0.5 flex-shrink-0" />
              <span className="text-xs text-slate-400">{ref}</span>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-slate-500">Danta v1.0 · Built for dental professionals</div>
      </main>
      <BottomNav />
    </div>
  )
}
