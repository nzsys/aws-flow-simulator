import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { getServiceDefinition } from '@/lib/constants/services'
import type { AWSServiceType, ServiceConfig } from '@/types'

export interface ServiceNodeData {
  serviceType: AWSServiceType
  config: ServiceConfig
  label: string
  [key: string]: unknown
}

export type ServiceNodeType = Node<ServiceNodeData, 'service'>

function ServiceNodeComponent({ data, selected }: NodeProps<ServiceNodeType>) {
  const { serviceType, config, label } = data
  const definition = getServiceDefinition(serviceType)
  const abbreviation = serviceType.slice(0, 2).toUpperCase()
  const cacheEnabled = config.cache?.enabled === true
  const cacheHitRate = config.cache?.hitRate ?? 0

  return (
    <div
      className={[
        'rounded-lg bg-white px-4 py-3 shadow-md border-2 min-w-[160px]',
        selected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-slate-200',
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white"
      />

      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: definition.color }}
        >
          {abbreviation}
        </div>

        <div className="min-w-0">
          <p className="truncate text-xs text-slate-500">{label}</p>
          <p className="truncate text-sm font-semibold text-slate-800">
            {config.name}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>~{config.latency.base}ms</span>
        {cacheEnabled && (
          <span>Cache: {Math.round(cacheHitRate * 100)}%</span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white"
      />
    </div>
  )
}

export const ServiceNode = memo(ServiceNodeComponent)
