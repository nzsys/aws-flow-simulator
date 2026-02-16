import { describe, it, expect, beforeEach } from 'vitest'
import { useArchitectureStore } from './architecture'
import type { Edge } from '@xyflow/react'

beforeEach(() => {
  useArchitectureStore.getState().reset()
})

describe('useArchitectureStore', () => {
  it('should start with empty state', () => {
    const state = useArchitectureStore.getState()

    expect(state.nodes).toHaveLength(0)
    expect(state.edges).toHaveLength(0)
    expect(state.selectedNodeId).toBeNull()
    expect(state.architectureName).toBe('Untitled Architecture')
  })

  it('should add a service node', () => {
    useArchitectureStore.getState().addServiceNode('route53', { x: 100, y: 200 })

    const state = useArchitectureStore.getState()
    expect(state.nodes).toHaveLength(1)
    expect(state.nodes[0].type).toBe('awsService')
    expect(state.nodes[0].position).toEqual({ x: 100, y: 200 })

    const data = state.nodes[0].data as Record<string, unknown>
    expect(data.serviceType).toBe('route53')
  })

  it('should add VPC as vpcGroup node type', () => {
    useArchitectureStore.getState().addServiceNode('vpc', { x: 0, y: 0 })

    const state = useArchitectureStore.getState()
    expect(state.nodes[0].type).toBe('vpcGroup')
  })

  it('should add Subnet as subnetGroup node type', () => {
    useArchitectureStore.getState().addServiceNode('subnet', { x: 0, y: 0 })

    const state = useArchitectureStore.getState()
    expect(state.nodes[0].type).toBe('subnetGroup')
  })

  it('should remove a node and its connected edges', () => {
    useArchitectureStore.getState().addServiceNode('route53', { x: 0, y: 0 })
    const nodeId = useArchitectureStore.getState().nodes[0].id

    useArchitectureStore.getState().addServiceNode('cloudfront', { x: 100, y: 0 })
    const targetId = useArchitectureStore.getState().nodes[1].id

    const edge: Edge = { id: 'e1', source: nodeId, target: targetId, type: 'flow' }
    useArchitectureStore.getState().addEdge(edge)

    expect(useArchitectureStore.getState().edges).toHaveLength(1)

    useArchitectureStore.getState().removeNode(nodeId)

    expect(useArchitectureStore.getState().nodes).toHaveLength(1)
    expect(useArchitectureStore.getState().edges).toHaveLength(0)
  })

  it('should select and deselect nodes', () => {
    useArchitectureStore.getState().addServiceNode('route53', { x: 0, y: 0 })
    const nodeId = useArchitectureStore.getState().nodes[0].id

    useArchitectureStore.getState().selectNode(nodeId)
    expect(useArchitectureStore.getState().selectedNodeId).toBe(nodeId)

    useArchitectureStore.getState().selectNode(null)
    expect(useArchitectureStore.getState().selectedNodeId).toBeNull()
  })

  it('should update node config immutably', () => {
    useArchitectureStore.getState().addServiceNode('route53', { x: 0, y: 0 })
    const nodeId = useArchitectureStore.getState().nodes[0].id
    const originalNode = useArchitectureStore.getState().nodes[0]

    useArchitectureStore.getState().updateNodeConfig(nodeId, { name: 'My Route53' })

    const updatedNode = useArchitectureStore.getState().nodes[0]
    const updatedData = updatedNode.data as Record<string, unknown>
    const updatedConfig = updatedData.config as Record<string, unknown>

    expect(updatedConfig.name).toBe('My Route53')
    expect(updatedNode).not.toBe(originalNode) // immutable
  })

  it('should load architecture', () => {
    useArchitectureStore.getState().loadArchitecture({
      id: 'arch-1',
      name: 'Test Arch',
      nodes: [{ id: 'n1', type: 'awsService', position: { x: 0, y: 0 }, data: {} }],
      edges: [],
    })

    const state = useArchitectureStore.getState()
    expect(state.architectureId).toBe('arch-1')
    expect(state.architectureName).toBe('Test Arch')
    expect(state.nodes).toHaveLength(1)
  })

  it('should add a node with parentId and extent', () => {
    useArchitectureStore.getState().addServiceNode('vpc', { x: 0, y: 0 })
    const vpcId = useArchitectureStore.getState().nodes[0].id

    useArchitectureStore.getState().addServiceNode('subnet', { x: 20, y: 40 }, vpcId)

    const subnetNode = useArchitectureStore.getState().nodes[1]
    expect(subnetNode.parentId).toBe(vpcId)
    expect(subnetNode.extent).toBe('parent')
    expect(subnetNode.position).toEqual({ x: 20, y: 40 })
  })

  it('should add a node without parentId when not provided', () => {
    useArchitectureStore.getState().addServiceNode('ecs', { x: 100, y: 100 })

    const node = useArchitectureStore.getState().nodes[0]
    expect(node.parentId).toBeUndefined()
    expect(node.extent).toBeUndefined()
  })

  it('should reset to initial state', () => {
    useArchitectureStore.getState().addServiceNode('route53', { x: 0, y: 0 })
    useArchitectureStore.getState().setArchitectureName('My Arch')

    useArchitectureStore.getState().reset()

    const state = useArchitectureStore.getState()
    expect(state.nodes).toHaveLength(0)
    expect(state.architectureName).toBe('Untitled Architecture')
  })
})
