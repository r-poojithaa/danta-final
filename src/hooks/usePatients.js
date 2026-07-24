import { useState, useEffect } from 'react'
import { patients as supabasePatients } from '../services/supabase.js'
import { offlinePatients, syncQueue } from '../services/offline.js'
import { useOnline } from './useOnline.js'

export function usePatients(userId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isOnline = useOnline()

  const load = async () => {
    setLoading(true)
    try {
      if (isOnline) {
        const { data: rows, error: err } = await supabasePatients.getAll(userId)
        if (err) throw err
        setData(rows ?? [])
        // Cache locally
        for (const p of rows ?? []) offlinePatients.save(p)
      } else {
        const rows = await offlinePatients.getAll(userId)
        setData(rows)
      }
    } catch (e) {
      setError(e.message)
      // Fallback to offline
      const rows = await offlinePatients.getAll(userId)
      setData(rows)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) load()
  }, [userId, isOnline])

  const createPatient = async (patientData) => {
    const newPatient = { ...patientData, created_by: userId, created_at: new Date().toISOString(), id: crypto.randomUUID() }
    if (isOnline) {
      const { data: row, error } = await supabasePatients.create(newPatient)
      if (!error) {
        setData(prev => [row, ...prev])
        offlinePatients.save(row)
        return { data: row, error: null }
      }
      return { data: null, error }
    } else {
      await offlinePatients.save(newPatient)
      await syncQueue.enqueue({ type: 'CREATE_PATIENT', payload: newPatient })
      setData(prev => [newPatient, ...prev])
      return { data: newPatient, error: null }
    }
  }

  return { data, loading, error, reload: load, createPatient }
}
