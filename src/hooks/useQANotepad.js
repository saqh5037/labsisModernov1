import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getQANotes, createQANote, updateQANote, deleteQANote,
  promoteQANote, createQABugsBatch
} from '../services/api'

const LS_NOTES = 'qa-notes'
const LS_QUEUE = 'qa-bug-queue'

function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback }
  catch { return fallback }
}

function saveLS(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export default function useQANotepad() {
  const [notes, setNotes] = useState(() => loadLS(LS_NOTES, []))
  const [queue, setQueue] = useState(() => loadLS(LS_QUEUE, []))
  const [submitting, setSubmitting] = useState(false)
  const [lastBatch, setLastBatch] = useState(null)
  const mounted = useRef(true)

  // Sync notes to localStorage on change
  useEffect(() => { saveLS(LS_NOTES, notes) }, [notes])
  useEffect(() => { saveLS(LS_QUEUE, queue) }, [queue])
  useEffect(() => () => { mounted.current = false }, [])

  // Fetch server notes on mount, merge with local
  useEffect(() => {
    getQANotes().then(({ notes: serverNotes }) => {
      if (!mounted.current) return
      setNotes(prev => {
        const serverIds = new Set(serverNotes.map(n => n.id))
        const localOnly = prev.filter(n => !serverIds.has(n.id) && !n._synced)
        return [...serverNotes, ...localOnly]
      })
    }).catch(() => {})
  }, [])

  // ─── Notes ──────────────────────────────────────────────
  const addNote = useCallback(async (text) => {
    const hex = Math.random().toString(16).slice(2, 6)
    const optimistic = {
      id: `note-${Date.now()}-${hex}`,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      promotedToBugId: null,
      archived: false,
    }
    setNotes(prev => [optimistic, ...prev])
    try {
      const saved = await createQANote(text)
      setNotes(prev => prev.map(n => n.id === optimistic.id ? { ...saved, _synced: true } : n))
      return saved
    } catch {
      return optimistic
    }
  }, [])

  const removeNote = useCallback(async (noteId) => {
    setNotes(prev => prev.filter(n => n.id !== noteId))
    try { await deleteQANote(noteId) } catch {}
  }, [])

  const editNote = useCallback(async (noteId, text) => {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, text } : n))
    try { await updateQANote(noteId, text) } catch {}
  }, [])

  const promoteNoteToBug = useCallback(async (noteId, { titulo, tipoError, severidad }) => {
    try {
      const bug = await promoteQANote(noteId, { titulo, tipoError, severidad })
      setNotes(prev => prev.filter(n => n.id !== noteId))
      return bug
    } catch (err) {
      console.error('Promote error:', err)
      return null
    }
  }, [])

  const promoteNoteToQueue = useCallback((noteId) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    const hex = Math.random().toString(16).slice(2, 6)
    const item = {
      queueId: `q-${Date.now()}-${hex}`,
      titulo: note.text,
      tipoError: '',
      severidad: 'mayor',
      nota: '',
      fromNoteId: noteId,
    }
    setQueue(prev => [...prev, item])
    setNotes(prev => prev.filter(n => n.id !== noteId))
    deleteQANote(noteId).catch(() => {})
  }, [notes])

  // ─── Queue ──────────────────────────────────────────────
  const addToQueue = useCallback(({ titulo, tipoError, severidad, nota }) => {
    const hex = Math.random().toString(16).slice(2, 6)
    setQueue(prev => [...prev, {
      queueId: `q-${Date.now()}-${hex}`,
      titulo,
      tipoError: tipoError || '',
      severidad: severidad || 'mayor',
      nota: nota || '',
      fromNoteId: null,
    }])
  }, [])

  const editQueueItem = useCallback((queueId, updates) => {
    setQueue(prev => prev.map(q => q.queueId === queueId ? { ...q, ...updates } : q))
  }, [])

  const removeFromQueue = useCallback((queueId) => {
    setQueue(prev => prev.filter(q => q.queueId !== queueId))
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
  }, [])

  const submitQueue = useCallback(async () => {
    if (queue.length === 0 || submitting) return null
    setSubmitting(true)
    setLastBatch(null)
    try {
      const result = await createQABugsBatch(queue.map(q => ({
        titulo: q.titulo,
        tipoError: q.tipoError,
        severidad: q.severidad,
        nota: q.nota,
      })))
      setQueue([])
      setLastBatch(result)
      return result
    } catch (err) {
      console.error('Batch submit error:', err)
      return null
    } finally {
      if (mounted.current) setSubmitting(false)
    }
  }, [queue, submitting])

  return {
    notes,
    queue,
    submitting,
    lastBatch,
    setLastBatch,
    // Notes
    addNote,
    removeNote,
    editNote,
    promoteNoteToBug,
    promoteNoteToQueue,
    // Queue
    addToQueue,
    editQueueItem,
    removeFromQueue,
    clearQueue,
    submitQueue,
    // Counts
    notesCount: notes.length,
    queueCount: queue.length,
  }
}
