import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import PatientList from './pages/PatientList.jsx'
import PatientProfile from './pages/PatientProfile.jsx'
import NewPatient from './pages/NewPatient.jsx'
import Assessment from './pages/Assessment.jsx'
import ImageCapture from './pages/ImageCapture.jsx'
import AssessmentResults from './pages/AssessmentResults.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import Help from './pages/Help.jsx'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-dvh bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30 animate-pulse">
          <span className="text-white font-black text-2xl">D</span>
        </div>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          {/* Private */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/patients" element={<PrivateRoute><PatientList /></PrivateRoute>} />
          <Route path="/patients/new" element={<PrivateRoute><NewPatient /></PrivateRoute>} />
          <Route path="/patients/:id" element={<PrivateRoute><PatientProfile /></PrivateRoute>} />

          <Route path="/assessment" element={<PrivateRoute><Assessment /></PrivateRoute>} />
          <Route path="/assessment/:patientId" element={<PrivateRoute><Assessment /></PrivateRoute>} />
          <Route path="/assessment/:patientId/camera" element={<PrivateRoute><ImageCapture /></PrivateRoute>} />
          <Route path="/assessment/:patientId/results/:assessmentId" element={<PrivateRoute><AssessmentResults /></PrivateRoute>} />
          <Route path="/assessment/:patientId/results/preview" element={<PrivateRoute><AssessmentResults /></PrivateRoute>} />

          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/help" element={<PrivateRoute><Help /></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
