import type { DragEvent } from 'react'
import type { ServiceDefinition } from '@/lib/constants/services'

interface ServiceCardProps {
  readonly definition: ServiceDefinition
}

export function ServiceCard({ definition }: ServiceCardProps) {
  const abbreviation = definition.type.slice(0, 2).toUpperCase()

  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData('application/aws-service', definition.type)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-2 rounded-md border border-gray-200 bg-white p-2 shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing"
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: definition.color }}
      >
        {abbreviation}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">
          {definition.label}
        </p>
        <p className="truncate text-xs text-gray-500">
          {definition.description}
        </p>
      </div>
    </div>
  )
}
