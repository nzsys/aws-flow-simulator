import { useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  addEdge,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useArchitectureStore } from '@/store/architecture'
import { useUIStore } from '@/store/ui'
import { ServiceNode } from './ServiceNode'
import { FlowEdge } from './FlowEdge'
import { VPCGroupNode } from './VPCGroupNode'
import { SubnetGroupNode } from './SubnetGroupNode'
import { getServiceDefinition, isInfrastructureService, canNestIn } from '@/lib/constants/services'
import { canConnect } from '@/lib/validation/connection-validator'
import { getConnectionProtocol } from '@/lib/validation/rules'
import type { AWSServiceType } from '@/types'
import type { Node } from '@xyflow/react'

const nodeTypes = {
  awsService: ServiceNode,
  vpcGroup: VPCGroupNode,
  subnetGroup: SubnetGroupNode,
} as const

const edgeTypes = { flow: FlowEdge } as const

const defaultEdgeOptions = {
  type: 'flow' as const,
  animated: true,
}

type ServiceNodeData = {
  readonly serviceType: AWSServiceType
  readonly [key: string]: unknown
}

export function getAbsolutePosition(
  node: Node,
  allNodes: readonly Node[],
): { readonly x: number; readonly y: number } {
  let x = node.position.x
  let y = node.position.y
  let current = node
  while (current.parentId) {
    const parent = allNodes.find((n) => n.id === current.parentId)
    if (!parent) break
    x += parent.position.x
    y += parent.position.y
    current = parent
  }
  return { x, y }
}

function getNodeServiceType(nodeId: string, nodes: readonly { id: string; data: Record<string, unknown> }[]): AWSServiceType | null {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return null
  return (node.data as ServiceNodeData).serviceType
}

export function FlowCanvas() {
  const reactFlowRef = useRef<ReactFlowInstance | null>(null)

  const nodes = useArchitectureStore((s) => s.nodes)
  const edges = useArchitectureStore((s) => s.edges)
  const onNodesChange = useArchitectureStore((s) => s.onNodesChange)
  const onEdgesChange = useArchitectureStore((s) => s.onEdgesChange)
  const setEdges = useArchitectureStore((s) => s.setEdges)
  const addServiceNode = useArchitectureStore((s) => s.addServiceNode)
  const selectNode = useArchitectureStore((s) => s.selectNode)
  const setConnectionFeedback = useUIStore((s) => s.setConnectionFeedback)

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceType = getNodeServiceType(connection.source, nodes)
      const targetType = getNodeServiceType(connection.target, nodes)

      if (sourceType && targetType) {
        const result = canConnect(sourceType, targetType)
        if (!result.allowed) {
          setConnectionFeedback({
            message: result.warning ?? `${sourceType} cannot connect to ${targetType}`,
            type: 'error',
          })
          return
        }
        if (result.warning) {
          setConnectionFeedback({ message: result.warning, type: 'warning' })
        }
      }

      const protocol =
        sourceType && targetType ? getConnectionProtocol(sourceType, targetType) : undefined

      setEdges(
        addEdge(
          { ...connection, type: 'flow', animated: true, data: { protocol } },
          edges,
        ),
      )
    },
    [edges, setEdges, nodes, setConnectionFeedback],
  )

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const serviceType = event.dataTransfer.getData('application/aws-service') as AWSServiceType

      if (!serviceType || !reactFlowRef.current) {
        return
      }

      const flowPosition = reactFlowRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const groupNodes = nodes
        .filter((n: Node) => n.type === 'subnetGroup' || n.type === 'vpcGroup')
        .sort((a: Node) => (a.type === 'subnetGroup' ? -1 : 1))

      for (const group of groupNodes) {
        const groupData = group.data as ServiceNodeData
        const groupType = groupData.serviceType

        const w = group.measured?.width ?? (group.type === 'vpcGroup' ? 600 : 250)
        const h = group.measured?.height ?? (group.type === 'vpcGroup' ? 400 : 200)

        const absPos = getAbsolutePosition(group, nodes)
        const absX = absPos.x
        const absY = absPos.y

        if (
          flowPosition.x >= absX &&
          flowPosition.x <= absX + w &&
          flowPosition.y >= absY &&
          flowPosition.y <= absY + h &&
          canNestIn(serviceType, groupType)
        ) {
          const relativePosition = {
            x: flowPosition.x - absX,
            y: flowPosition.y - absY,
          }
          addServiceNode(serviceType, relativePosition, group.id)
          return
        }
      }

      addServiceNode(serviceType, flowPosition)
    },
    [addServiceNode, nodes],
  )

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id)
    },
    [selectNode],
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  const miniMapNodeColor = useCallback((node: { data?: Record<string, unknown> }) => {
    const serviceType = node.data?.serviceType as AWSServiceType | undefined
    if (!serviceType) {
      return '#94a3b8'
    }
    const def = getServiceDefinition(serviceType)
    if (isInfrastructureService(serviceType)) {
      return def.color + '66' // semi-transparent for infra
    }
    return def.color
  }, [])

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onInit={(instance) => {
          reactFlowRef.current = instance
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
      >
        <Background gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor="rgba(0, 0, 0, 0.1)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  )
}
