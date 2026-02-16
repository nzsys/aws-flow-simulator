import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

interface FlowEdgeData {
  protocol?: string
  [key: string]: unknown
}

function FlowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  })

  const edgeData = data as FlowEdgeData | undefined
  const protocol = edgeData?.protocol

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#94a3b8',
          strokeWidth: 2,
          strokeDasharray: '6 3',
          animation: 'flow-dash 0.6s linear infinite',
          ...style,
        }}
      />

      {protocol && (
        <foreignObject
          width={56}
          height={22}
          x={labelX - 28}
          y={labelY - 11}
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="flex h-full w-full items-center justify-center">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200">
              {protocol}
            </span>
          </div>
        </foreignObject>
      )}
    </>
  )
}

export const FlowEdge = memo(FlowEdgeComponent)
