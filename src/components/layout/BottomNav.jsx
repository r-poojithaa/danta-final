import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, ScanLine, BarChart2 } from 'lucide-react'

const TABS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/patients', icon: Users, label: 'Patients' },
  { path: '/assessment', icon: ScanLine, label: 'Assess' },
  { path: '/reports', icon: BarChart2, label: 'Reports' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const nav = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-surface-border">
      <div className="flex items-center justify-around py-2 px-4 max-w-lg mx-auto">
        {TABS.map(({ path, icon: Icon, label }) => {
          const active = pathname.startsWith(path)
          return (
            <button
              key={path}
              onClick={() => nav(path)}
              className={`nav-item ${active ? 'active' : ''} min-w-[60px]`}
              id={`nav-${label.toLowerCase()}`}
            >
              <div className={`p-2 rounded-xl transition-all duration-200 ${active ? 'bg-primary/20' : ''}`}>
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
