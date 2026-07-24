/**
 * Offline Storage – IndexedDB wrapper using idb library
 * Allows full functionality without internet connectivity
 */
import { openDB } from 'idb'

const DB_NAME = 'danta-offline'
const DB_VERSION = 1

let _db = null

async function getDB() {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Patients store
      if (!db.objectStoreNames.contains('patients')) {
        const patientStore = db.createObjectStore('patients', { keyPath: 'id' })
        patientStore.createIndex('created_by', 'created_by')
        patientStore.createIndex('updated_at', 'updated_at')
      }
      // Assessments store
      if (!db.objectStoreNames.contains('assessments')) {
        const assessStore = db.createObjectStore('assessments', { keyPath: 'id' })
        assessStore.createIndex('patient_id', 'patient_id')
        assessStore.createIndex('created_by', 'created_by')
      }
      // Sync queue
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true })
      }
      // Cached images (base64)
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'key' })
      }
    },
  })
  return _db
}

// ─── Patients ─────────────────────────────────────────────────────────────────
export const offlinePatients = {
  getAll: async (userId) => {
    const db = await getDB()
    const all = await db.getAll('patients')
    return all.filter(p => p.created_by === userId)
  },
  getById: async (id) => {
    const db = await getDB()
    return db.get('patients', id)
  },
  save: async (patient) => {
    const db = await getDB()
    await db.put('patients', { ...patient, _offline: true, updated_at: new Date().toISOString() })
  },
  delete: async (id) => {
    const db = await getDB()
    await db.delete('patients', id)
  },
}

// ─── Assessments ──────────────────────────────────────────────────────────────
export const offlineAssessments = {
  getForPatient: async (patientId) => {
    const db = await getDB()
    return db.getAllFromIndex('assessments', 'patient_id', patientId)
  },
  save: async (assessment) => {
    const db = await getDB()
    await db.put('assessments', { ...assessment, _offline: true, updated_at: new Date().toISOString() })
  },
}

// ─── Sync Queue ───────────────────────────────────────────────────────────────
export const syncQueue = {
  enqueue: async (operation) => {
    const db = await getDB()
    await db.add('sync_queue', { ...operation, queued_at: new Date().toISOString() })
  },
  getAll: async () => {
    const db = await getDB()
    return db.getAll('sync_queue')
  },
  dequeue: async (id) => {
    const db = await getDB()
    await db.delete('sync_queue', id)
  },
  count: async () => {
    const db = await getDB()
    return db.count('sync_queue')
  },
}

// ─── Image Cache ──────────────────────────────────────────────────────────────
export const imageCache = {
  save: async (key, base64) => {
    const db = await getDB()
    await db.put('images', { key, base64, cached_at: new Date().toISOString() })
  },
  get: async (key) => {
    const db = await getDB()
    const entry = await db.get('images', key)
    return entry?.base64 ?? null
  },
}
