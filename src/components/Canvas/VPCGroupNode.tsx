import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'

type VPCGroupData = {
  readonly label: string
  readonly [key: string]: unknown
}

type VPCGroupNodeType = Node<VPCGroupData, 'vpcGroup'>

function VPCGroupNodeComponent({ data, selected }: NodeProps<VPCGroupNodeType>) {
  return (
    <div
      className={[
        'rounded-xl border-2 border-dashed bg-green-50/30 p-4',
        'min-h-[400px] min-w-[600px] h-full w-full',
        selected ? 'border-green-500 ring-2 ring-green-300' : 'border-green-300',
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />

      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-green-600 text-xs font-bold text-white">
          V
        </div>
        <span className="text-xs font-semibold text-green-800">{data.label}</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
    </div>
  )
}

export const VPCGroupNode = memo(VPCGroupNodeComponent)
