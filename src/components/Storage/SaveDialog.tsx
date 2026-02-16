import { useState, useCallback } from 'react'
import { useArchitectureStore } from '@/store/architecture'
import { useUIStore } from '@/store/ui'
import { saveArchitecture } from '@/lib/db/operations'
import { v4 as uuidv4 } from 'uuid'

export function SaveDialog() {
  const architectureId = useArchitectureStore((s) => s.architectureId)
  const architectureName = useArchitectureStore((s) => s.architectureName)
  const nodes = useArchitectureStore((s) => s.nodes)
  const edges = useArchitectureStore((s) => s.edges)
  const setArchitectureName = useArchitectureStore((s) => s.setArchitectureName)
  const setSaveDialogOpen = useUIStore((s) => s.setSaveDialogOpen)

  const [name, setName] = useState(architectureName)
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim()
    if (trimmedName.length === 0) {
      setError('Name is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const id = architectureId || uuidv4()

      await saveArchitecture({
        id,
        name: trimmedName,
        description: description.trim() || undefined,
        nodes: [...nodes],
        edges: [...edges],
      })

      setArchitectureName(trimmedName)
      setSaveDialogOpen(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save architecture'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }, [
    name,
    description,
    architectureId,
    nodes,
    edges,
    setArchitectureName,
    setSaveDialogOpen,
  ])

  const handleClose = useCallback(() => {
    setSaveDialogOpen(false)
  }, [setSaveDialogOpen])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    },
    [handleClose]
  )

  return (
    <div
      className="modal-overlay"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Save architecture"
    >
      <div
        className="modal-content w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Save Architecture
        </h2>

        <div className="mb-4">
          <label
            htmlFor="save-name"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Name
          </label>
          <input
            id="save-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Architecture name"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="save-description"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Description (optional)
          </label>
          <textarea
            id="save-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            rows={3}
            placeholder="Brief description of this architecture"
          />
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="btn-cancel disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || name.trim().length === 0}
            className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
