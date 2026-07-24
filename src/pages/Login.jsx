import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Stethoscope, Lock, Mail, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const { signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    if (isSignUp) {
      const { error: err } = await signUp(email, password, { full_name: 'Dr. Clinician' })
      setLoading(false)
      if (err) {
        setError(err.message)
      } else {
        setError('Success! You can now sign in (check email if confirmation is required).')
        setIsSignUp(false)
      }
    } else {
      const { error: err } = await signIn(email, password)
      setLoading(false)
      if (err) {
        setError(err.message)
      } else {
        navigate('/dashboard')
      }
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await resetPassword(email)
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setError('Success! If an account exists for this email, you will receive a reset link shortly.')
    }
  }

  const getTitle = () => {
    if (isForgotPassword) return 'Reset password'
    if (isSignUp) return 'Create account'
    return 'Welcome back'
  }

  const getSubtitle = () => {
    if (isForgotPassword) return 'Enter your email to receive a reset link'
    if (isSignUp) return 'Sign up for a clinical account'
    return 'Sign in to your clinical account'
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 relative overflow-hidden bg-surface">
      {/* Background gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 rounded-full bg-primary/20 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 rounded-full bg-accent/10 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-2xl shadow-primary/30">
            <Stethoscope size={38} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Danta</h1>
          <p className="text-slate-400 text-sm mt-1 text-center">Bayesian Clinical Decision Support</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-7 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-1">
            {getTitle()}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {getSubtitle()}
          </p>

          {error && (
            <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl mb-5 border ${error.includes('Success') ? 'bg-risk-low/10 border-risk-low/30 text-risk-low' : 'bg-risk-high/10 border-risk-high/30 text-risk-high'}`}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={isForgotPassword ? handleResetPassword : handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="input-email"
                  type="email"
                  className="input-field pl-10"
                  placeholder="doctor@clinic.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password - Only show if NOT in Forgot Password mode */}
            {!isForgotPassword && (
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="input-password"
                    type={showPw ? 'text' : 'password'}
                    className="input-field pl-10 pr-11"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember + Forgot - Only show in Sign In mode */}
            {!isSignUp && !isForgotPassword && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="text-sm text-slate-400">Remember me</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => { setIsForgotPassword(true); setError(''); }}
                  className="text-sm text-primary hover:text-primary-light transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isForgotPassword ? 'Sending link…' : (isSignUp ? 'Creating account…' : 'Signing in…')}
                </>
              ) : (
                isForgotPassword ? 'Send Reset Link' : (isSignUp ? 'Sign Up' : 'Sign In')
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm">
            {isForgotPassword ? (
              <button
                onClick={() => { setIsForgotPassword(false); setError(''); }}
                className="text-primary hover:text-primary-light font-medium transition-colors"
              >
                Back to sign in
              </button>
            ) : (
              <>
                <span className="text-slate-400">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                </span>{' '}
                <button
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                  className="text-primary hover:text-primary-light font-medium transition-colors"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Danta v1.0 · HIPAA-compliant · End-to-end encrypted
        </p>
      </div>
    </div>
  )
}
