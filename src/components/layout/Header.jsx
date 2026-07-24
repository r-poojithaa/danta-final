import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X, Settings, HelpCircle, RefreshCw, WifiOff, Info, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useOnline } from '../../hooks/useOnline.js'
import { syncQueue } from '../../services/offline.js'

export default function Header({ title }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const isOnline = useOnline()

  const menuItems = [
    { icon: Settings, label: 'Settings', action: () => navigate('/settings') },
    { icon: HelpCircle, label: 'Help & Docs', action: () => navigate('/help') },
    { icon: RefreshCw, label: 'Sync Status', action: () => {} },
    { icon: Info, label: 'About Danta', action: () => {} },
    { icon: LogOut, label: 'Sign Out', action: signOut, danger: true },
  ]

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-surface-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => setMenuOpen(true)} className="p-2 hover:bg-surface-card rounded-xl transition-colors" id="btn-menu">
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-black">D</span>
            </div>
            <span className="font-bold text-white">{title || 'Danta'}</span>
          </div>

          <div className="flex items-center gap-2">
            {!isOnline && (
              <div className="flex items-center gap-1 bg-risk-medium/20 text-risk-medium px-2 py-1 rounded-full text-xs font-semibold">
                <WifiOff size={12} />
                Offline
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-primary text-sm font-bold">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* Hamburger overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="relative w-72 glass border-r border-surface-border flex flex-col p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-white font-black text-lg">D</span>
                </div>
                <div>
                  <div className="font-bold text-white">Danta</div>
                  <div className="text-xs text-slate-400">{user?.email}</div>
                </div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-surface-card rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-1 flex-1">
              {menuItems.map(({ icon: Icon, label, action, danger }) => (
                <button
                  key={label}
                  onClick={() => { setMenuOpen(false); action() }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    danger
                      ? 'text-risk-high hover:bg-risk-high/10'
                      : 'text-slate-300 hover:bg-surface-card hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 glass-light rounded-xl">
              <div className="text-xs text-slate-400 mb-1">Network Status</div>
              <div className={`text-sm font-semibold ${isOnline ? 'text-risk-low' : 'text-risk-medium'}`}>
                {isOnline ? '● Connected' : '● Offline Mode'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
