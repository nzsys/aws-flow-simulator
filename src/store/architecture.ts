import { create } from 'zustand'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import type { Node, Edge, NodeChange, EdgeChange } from '@xyflow/react'
import { v4 as uuidv4 } from 'uuid'
import { SERVICE_DEFINITIONS } from '@/lib/constants/services'
import type { AWSServiceType, AWSServiceNode } from '@/types'

type ArchitectureState = {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  architectureId: string
  architectureName: string

  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  addServiceNode: (type: AWSServiceType, position: { x: number; y: number }, parentId?: string) => void
  removeNode: (nodeId: string) => void
  selectNode: (nodeId: string | null) => void
  updateNodeConfig: (nodeId: string, config: Partial<AWSServiceNode['config']>) => void
  addEdge: (edge: Edge) => void
  removeEdge: (edgeId: string) => void
  reset: () => void
  loadArchitecture: (data: {
    id: string
    name: string
    nodes: Node[]
    edges: Edge[]
  }) => void
  setArchitectureName: (name: string) => void
}

function getNodeType(serviceType: AWSServiceType): string {
  if (serviceType === 'vpc') return 'vpcGroup'
  if (serviceType === 'subnet') return 'subnetGroup'
  return 'awsService'
}

const initialState = {
  nodes: [] as Node[],
  edges: [] as Edge[],
  selectedNodeId: null as string | null,
  architectureId: uuidv4(),
  architectureName: 'Untitled Architecture',
}

export const useArchitectureStore = create<ArchitectureState>((set) => ({
  ...initialState,

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),

  addServiceNode: (type, position, parentId?) => {
    const definition = SERVICE_DEFINITIONS[type]
    const nodeId = uuidv4()
    const nodeType = getNodeType(type)

    const baseData: Record<string, unknown> = {
      serviceType: type,
      config: { ...definition.defaultConfig },
      label: definition.label,
    }

    if (type === 'subnet') {
      const specific = definition.defaultConfig.specific as
        | { subnetType?: string }
        | undefined
      baseData.subnetType = specific?.subnetType ?? 'public'
    }

    const newNode: Node = {
      id: nodeId,
      type: nodeType,
      position,
      data: baseData,
      ...(parentId ? { parentId, extent: 'parent' as const } : {}),
    }

    set((state) => ({
      nodes: [...state.nodes, newNode],
    }))
  },

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    })),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  updateNodeConfig: (nodeId, config) =>
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) return node
        const currentData = node.data as Record<string, unknown>
        const currentConfig = (currentData.config ?? {}) as Record<string, unknown>
        return {
          ...node,
          data: {
            ...currentData,
            config: {
              ...currentConfig,
              ...config,
            },
          },
        }
      }),
    })),

  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),

  removeEdge: (edgeId) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
    })),

  reset: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      architectureId: uuidv4(),
      architectureName: 'Untitled Architecture',
    }),

  loadArchitecture: (data) =>
    set({
      architectureId: data.id,
      architectureName: data.name,
      nodes: data.nodes,
      edges: data.edges,
      selectedNodeId: null,
    }),

  setArchitectureName: (name) => set({ architectureName: name }),
}))
