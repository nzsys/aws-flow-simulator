import type { AWSServiceType, ServiceConfig } from './aws-services'

export type AWSServiceNode = {
  readonly id: string
  readonly type: AWSServiceType
  readonly position: { readonly x: number; readonly y: number }
  readonly config: ServiceConfig
  readonly parentId?: string
}

export type FlowEdge = {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly protocol?: 'http' | 'https' | 'tcp' | 'udp' | 'dns' | 'invoke' | 'inline'
  readonly bandwidth?: number
}

export type Architecture = {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly nodes: readonly AWSServiceNode[]
  readonly edges: readonly FlowEdge[]
  readonly createdAt: Date
  readonly updatedAt: Date
}
