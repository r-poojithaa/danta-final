import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase credentials missing! Check your Vercel Environment Variables.')
}

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signUp: (email, password, meta) => supabase.auth.signUp({ email, password, options: { data: meta } }),
  signOut: () => supabase.auth.signOut(),
  getUser: () => supabase.auth.getUser(),
  onAuthChange: (cb) => supabase.auth.onAuthStateChange(cb),
  resetPassword: (email) => supabase.auth.resetPasswordForEmail(email),
}

// ─── Patients ─────────────────────────────────────────────────────────────────
export const patients = {
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('patients')
      .select('*, assessments(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  create: async (patientData) => {
    const { data, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select()
      .single()
    return { data, error }
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  delete: async (id) => supabase.from('patients').delete().eq('id', id),
}

// ─── Assessments ──────────────────────────────────────────────────────────────
export const assessments = {
  getForPatient: async (patientId) => {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  create: async (assessmentData) => {
    const { data, error } = await supabase
      .from('assessments')
      .insert([assessmentData])
      .select()
      .single()
    return { data, error }
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('assessments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  getRecent: async (userId, limit = 10) => {
    const { data, error } = await supabase
      .from('assessments')
      .select('*, patients(full_name, date_of_birth)')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },
}

// ─── Image Storage ────────────────────────────────────────────────────────────
export const storage = {
  uploadImage: async (assessmentId, file, fileName) => {
    const path = `assessments/${assessmentId}/${fileName}`
    const { data, error } = await supabase.storage
      .from('intraoral-images')
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) return { url: null, error }
    const { data: urlData } = supabase.storage.from('intraoral-images').getPublicUrl(path)
    return { url: urlData.publicUrl, error: null, path }
  },

  getImages: async (assessmentId) => {
    const { data, error } = await supabase.storage
      .from('intraoral-images')
      .list(`assessments/${assessmentId}`)
    return { data, error }
  },

  deleteImage: async (path) => supabase.storage.from('intraoral-images').remove([path]),
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export const stats = {
  getDashboard: async (userId) => {
    const [patientsRes, assessmentsRes] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact' }).eq('created_by', userId),
      supabase.from('assessments').select('risk_level', { count: 'exact' }).eq('created_by', userId),
    ])
    const highRisk = assessmentsRes.data?.filter(a => a.risk_level === 'HIGH').length ?? 0
    const medRisk = assessmentsRes.data?.filter(a => a.risk_level === 'MEDIUM').length ?? 0
    const lowRisk = assessmentsRes.data?.filter(a => a.risk_level === 'LOW').length ?? 0
    return {
      totalPatients: patientsRes.count ?? 0,
      totalAssessments: assessmentsRes.count ?? 0,
      highRisk,
      medRisk,
      lowRisk,
    }
  },
}
