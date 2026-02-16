import { useState, useCallback, useRef, useEffect } from 'react'
import { useArchitectureStore } from '@/store/architecture'
import { useUIStore } from '@/store/ui'

export function Header() {
  const architectureName = useArchitectureStore((s) => s.architectureName)
  const setArchitectureName = useArchitectureStore((s) => s.setArchitectureName)
  const reset = useArchitectureStore((s) => s.reset)
  const setSaveDialogOpen = useUIStore((s) => s.setSaveDialogOpen)
  const setLoadDialogOpen = useUIStore((s) => s.setLoadDialogOpen)
  const simulationPanelOpen = useUIStore((s) => s.simulationPanelOpen)
  const toggleSimulationPanel = useUIStore((s) => s.toggleSimulationPanel)

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(architectureName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleNameClick = useCallback(() => {
    setEditValue(architectureName)
    setIsEditing(true)
  }, [architectureName])

  const handleNameSubmit = useCallback(() => {
    const trimmed = editValue.trim()
    if (trimmed.length > 0) {
      setArchitectureName(trimmed)
    }
    setIsEditing(false)
  }, [editValue, setArchitectureName])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleNameSubmit()
      }
      if (e.key === 'Escape') {
        setIsEditing(false)
      }
    },
    [handleNameSubmit]
  )

  const handleNewClick = useCallback(() => {
    reset()
  }, [reset])

  const handleSaveClick = useCallback(() => {
    setSaveDialogOpen(true)
  }, [setSaveDialogOpen])

  const handleLoadClick = useCallback(() => {
    setLoadDialogOpen(true)
  }, [setLoadDialogOpen])

  return (
    <header className="flex h-12 items-center justify-between bg-[#232f3e] px-4 text-white">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">
          AWS <span className="text-orange-400">Flow</span> Simulator
        </span>
      </div>

      <div className="flex items-center">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            className="rounded border border-gray-500 bg-gray-700 px-2 py-0.5 text-center text-sm text-white focus:border-orange-400 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={handleNameClick}
            className="rounded px-2 py-0.5 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-700 hover:text-white"
            title="Click to rename"
          >
            {architectureName}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleNewClick}
          className="btn-secondary"
        >
          New
        </button>
        <button
          type="button"
          onClick={handleSaveClick}
          className="btn-primary"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleLoadClick}
          className="btn-header-load"
        >
          Load
        </button>
        <button
          type="button"
          onClick={toggleSimulationPanel}
          className={
            simulationPanelOpen
              ? 'rounded-md bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600'
              : 'rounded-md bg-slate-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-500'
          }
        >
          Simulate
        </button>
      </div>
    </header>
  )
}
