import { useState, useCallback } from 'react'

const KEY_PREFIX = 'dash_areas_'

export default function useDashAreaPrefs(userId, bioanalistaAreas) {
  const key = userId ? KEY_PREFIX + userId : null

  const readStored = () => {
    if (!key) return null
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return undefined // no custom pref
      return JSON.parse(raw)
    } catch {
      return undefined
    }
  }

  const [stored, setStored] = useState(readStored)

  // null = show all, undefined = use defaults, array = custom selection
  const visibleAreaIds = stored !== undefined
    ? stored
    : bioanalistaAreas?.length > 0
      ? bioanalistaAreas.map(a => a.id)
      : null

  const setVisibleAreaIds = useCallback((ids) => {
    if (!key) return
    if (ids === null) {
      localStorage.removeItem(key)
      setStored(undefined)
    } else {
      localStorage.setItem(key, JSON.stringify(ids))
      setStored(ids)
    }
  }, [key])

  const isCustomized = stored !== undefined && stored !== null

  return { visibleAreaIds, setVisibleAreaIds, isCustomized }
}
