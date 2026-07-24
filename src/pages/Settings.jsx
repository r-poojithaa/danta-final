import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Bell, Shield, RefreshCw, Info, LogOut, ChevronRight, Moon, Wifi } from 'lucide-react'
import Header from '../components/layout/Header.jsx'
import BottomNav from '../components/layout/BottomNav.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useOnline } from '../hooks/useOnline.js'
import { syncQueue } from '../services/offline.js'

export default function Settings() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const isOnline = useOnline()
  const [notifications, setNotifications] = useState(true)
  const [autoSync, setAutoSync] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    await new Promise(r => setTimeout(r, 1500))
    setSyncing(false)
  }

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', sub: user?.email, action: () => {} },
        { icon: Shield, label: 'Security & Privacy', sub: 'HIPAA compliant · E2E encrypted', action: () => {} },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          sub: 'High-risk patient alerts',
          toggle: true,
          value: notifications,
          onToggle: () => setNotifications(v => !v),
        },
        {
          icon: RefreshCw,
          label: 'Auto Sync',
          sub: 'Sync when online',
          toggle: true,
          value: autoSync,
          onToggle: () => setAutoSync(v => !v),
        },
      ],
    },
    {
      title: 'Data',
      items: [
        {
          icon: Wifi,
          label: isOnline ? 'Sync Now' : 'Offline – Cannot Sync',
          sub: isOnline ? 'Upload pending offline data' : 'Connect to internet to sync',
          action: isOnline ? handleSync : undefined,
          loading: syncing,
        },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: Info, label: 'About Danta', sub: 'Version 1.0.0 · Bayesian CDSS', action: () => {} },
      ],
    },
  ]

  return (
    <div className="min-h-dvh bg-surface pb-24 pt-16">
      <Header title="Settings" />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6 animate-fade-in">
        <h1 className="text-2xl font-extrabold text-white">Settings</h1>

        {/* User card */}
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-white">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-white">{user?.user_metadata?.full_name ?? 'Dental Clinician'}</div>
            <div className="text-sm text-slate-400">{user?.email}</div>
          </div>
          <div className="ml-auto">
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-risk-low' : 'bg-risk-medium'}`} />
          </div>
        </div>

        {sections.map(sec => (
          <div key={sec.title} className="space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">{sec.title}</div>
            <div className="card divide-y divide-surface-border p-0 overflow-hidden">
              {sec.items.map(item => (
                <div
                  key={item.label}
                  onClick={!item.toggle ? item.action : undefined}
                  className={`flex items-center gap-3 px-4 py-4 ${item.action && !item.toggle ? 'cursor-pointer hover:bg-surface-border/30 transition-colors' : ''}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-surface-border flex items-center justify-center flex-shrink-0">
                    {item.loading
                      ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      : <item.icon size={18} className="text-slate-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{item.label}</div>
                    {item.sub && <div className="text-xs text-slate-400 truncate">{item.sub}</div>}
                  </div>
                  {item.toggle ? (
                    <button
                      onClick={item.onToggle}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${item.value ? 'bg-primary' : 'bg-surface-border'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${item.value ? 'left-6' : 'left-1'}`} />
                    </button>
                  ) : item.action ? (
                    <ChevronRight size={16} className="text-slate-600" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Sign out */}
        <button
          id="btn-sign-out"
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-risk-high/30 bg-risk-high/10 text-risk-high font-semibold hover:bg-risk-high/20 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </main>
      <BottomNav />
    </div>
  )
}
