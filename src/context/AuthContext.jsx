import { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../services/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = auth.onAuthChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await auth.signIn(email, password)
    if (!error) setUser(data.user)
    return { data, error }
  }

  const signOut = async () => {
    await auth.signOut()
    setUser(null)
  }

  const signUp = async (email, password, meta) => {
    const { data, error } = await auth.signUp(email, password, meta)
    return { data, error }
  }

  const resetPassword = async (email) => {
    const { data, error } = await auth.resetPassword(email)
    return { data, error }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
