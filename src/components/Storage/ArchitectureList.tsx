import { useCallback } from 'react'
import { PRESET_ARCHITECTURES } from '@/lib/db/presets'
import type { PresetScale } from '@/lib/db/presets'

type ArchitectureItem = {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly updatedAt: Date
  readonly nodes: readonly unknown[]
}

type ArchitectureListProps = {
  readonly architectures: readonly ArchitectureItem[]
  readonly onSelect: (id: string) => void
  readonly onDelete: (id: string) => void
}

type ScaleInfo = {
  readonly scale: PresetScale
  readonly description: string
}

const SCALE_BADGE_STYLES: Record<PresetScale, string> = {
  S: 'bg-green-100 text-green-700',
  M: 'bg-yellow-100 text-yellow-700',
  L: 'bg-orange-100 text-orange-700',
  XL: 'bg-red-100 text-red-700',
}

const presetScaleMap = new Map<string, ScaleInfo>(
  PRESET_ARCHITECTURES.map((p) => [
    p.id,
    { scale: p.scale, description: p.scaleDescription },
  ]),
)

function getPresetScale(id: string): ScaleInfo | undefined {
  return presetScaleMap.get(id)
}

function formatDate(date: Date): string {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hours}:${minutes}`
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength)}...`
}

export function ArchitectureList({
  architectures,
  onSelect,
  onDelete,
}: ArchitectureListProps) {
  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      onDelete(id)
    },
    [onDelete]
  )

  if (architectures.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        保存済みのアーキテクチャはありません
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {architectures.map((arch) => {
        const scaleInfo = getPresetScale(arch.id)
        return (
          <button
            key={arch.id}
            type="button"
            onClick={() => onSelect(arch.id)}
            className="group flex items-start justify-between rounded-md border border-gray-200 bg-white p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{arch.name}</p>
                {scaleInfo && (
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${SCALE_BADGE_STYLES[scaleInfo.scale]}`}
                    title={scaleInfo.description}
                  >
                    {scaleInfo.scale}
                  </span>
                )}
              </div>
              {arch.description && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {truncateText(arch.description, 60)}
                </p>
              )}
              <div className="mt-1.5 flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {arch.nodes.length} nodes
                </span>
                <span className="text-xs text-gray-400">
                  {formatDate(arch.updatedAt)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => handleDelete(e, arch.id)}
              className="ml-3 shrink-0 rounded px-2 py-1 text-xs text-red-500 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
              aria-label={`Delete ${arch.name}`}
            >
              Delete
            </button>
          </button>
        )
      })}
    </div>
  )
}
