import { useState, useEffect, useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { useArchitectureStore } from '@/store/architecture'
import { useUIStore } from '@/store/ui'
import {
  listArchitectures,
  loadArchitecture,
  deleteArchitecture,
} from '@/lib/db/operations'
import { ArchitectureList } from './ArchitectureList'

type ArchitectureEntry = {
  id: string
  name: string
  description?: string
  updatedAt: Date
  nodes: unknown[]
}

export function LoadDialog() {
  const storeLoadArchitecture = useArchitectureStore((s) => s.loadArchitecture)
  const setLoadDialogOpen = useUIStore((s) => s.setLoadDialogOpen)

  const [architectures, setArchitectures] = useState<readonly ArchitectureEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const list = await listArchitectures()
      setArchitectures(list)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load architecture list'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleSelect = useCallback(
    async (id: string) => {
      try {
        const data = await loadArchitecture(id)
        if (!data) {
          setError('Architecture not found')
          return
        }

        storeLoadArchitecture({
          id: data.id,
          name: data.name,
          nodes: data.nodes as Node[],
          edges: data.edges as Edge[],
        })

        setLoadDialogOpen(false)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load architecture'
        setError(message)
      }
    },
    [storeLoadArchitecture, setLoadDialogOpen]
  )

  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteConfirmId(id)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId) return

    try {
      await deleteArchitecture(deleteConfirmId)
      setArchitectures((prev) =>
        prev.filter((arch) => arch.id !== deleteConfirmId)
      )
      setDeleteConfirmId(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete architecture'
      setError(message)
    }
  }, [deleteConfirmId])

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmId(null)
  }, [])

  const handleClose = useCallback(() => {
    setLoadDialogOpen(false)
  }, [setLoadDialogOpen])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmId) {
          handleDeleteCancel()
        } else {
          handleClose()
        }
      }
    },
    [deleteConfirmId, handleDeleteCancel, handleClose]
  )

  return (
    <div
      className="modal-overlay"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Load architecture"
    >
      <div
        className="modal-content w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Load Architecture
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {deleteConfirmId && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="mb-2 text-sm text-red-800">
              Are you sure you want to delete this architecture? This action
              cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg
                className="h-6 w-6 animate-spin text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
          ) : (
            <ArchitectureList
              architectures={architectures}
              onSelect={handleSelect}
              onDelete={handleDeleteRequest}
            />
          )}
        </div>
      </div>
    </div>
  )
}
