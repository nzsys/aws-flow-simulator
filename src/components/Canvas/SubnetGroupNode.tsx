import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'

type SubnetGroupData = {
  readonly label: string
  readonly subnetType: 'public' | 'private'
  readonly [key: string]: unknown
}

type SubnetGroupNodeType = Node<SubnetGroupData, 'subnetGroup'>

function SubnetGroupNodeComponent({ data, selected }: NodeProps<SubnetGroupNodeType>) {
  const isPublic = data.subnetType === 'public'
  const borderColor = isPublic
    ? selected
      ? 'border-emerald-500 ring-2 ring-emerald-300'
      : 'border-emerald-300'
    : selected
      ? 'border-blue-500 ring-2 ring-blue-300'
      : 'border-blue-300'

  const bgColor = isPublic ? 'bg-emerald-50/40' : 'bg-blue-50/40'
  const badgeColor = isPublic ? 'bg-emerald-600' : 'bg-blue-600'
  const textColor = isPublic ? 'text-emerald-800' : 'text-blue-800'

  return (
    <div
      className={[
        'rounded-lg border-2 p-3',
        'min-h-[200px] min-w-[250px] h-full w-full',
        borderColor,
        bgColor,
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white"
      />

      <div className="mb-2 flex items-center gap-2">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white ${badgeColor}`}
        >
          S
        </div>
        <span className={`text-xs font-semibold ${textColor}`}>{data.label}</span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
            isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
          }`}
        >
          {isPublic ? 'Public' : 'Private'}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white"
      />
    </div>
  )
}

export const SubnetGroupNode = memo(SubnetGroupNodeComponent)
