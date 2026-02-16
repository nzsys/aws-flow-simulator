declare const __brand: unique symbol

type Brand<T, B extends string> = T & { readonly [__brand]: B }

export type ArchitectureId = Brand<string, 'ArchitectureId'>
export type NodeId = Brand<string, 'NodeId'>
export type EdgeId = Brand<string, 'EdgeId'>
export type SimulationId = Brand<string, 'SimulationId'>

export function createArchitectureId(id: string): ArchitectureId {
  return id as ArchitectureId
}

export function createNodeId(id: string): NodeId {
  return id as NodeId
}

export function createEdgeId(id: string): EdgeId {
  return id as EdgeId
}

export function createSimulationId(id: string): SimulationId {
  return id as SimulationId
}
