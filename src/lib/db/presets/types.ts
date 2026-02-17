import type { AWSServiceType, ServiceConfig } from '@/types'
import type { ConnectionProtocol } from '@/lib/validation/rules'

export type PresetScale = 'S' | 'M' | 'L' | 'XL'

export type PresetNode = {
  readonly id: string
  readonly type: string
  readonly position: { readonly x: number; readonly y: number }
  readonly data: {
    readonly serviceType: AWSServiceType
    readonly config: ServiceConfig
    readonly label: string
    readonly subnetType?: 'public' | 'private'
  }
  readonly parentId?: string
  readonly extent?: 'parent'
  readonly style?: { readonly width?: number; readonly height?: number }
}

export type PresetEdge = {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly type: 'flow'
  readonly animated: true
  readonly data: { readonly protocol: ConnectionProtocol }
}

export type PresetArchitecture = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly scale: PresetScale
  readonly scaleDescription: string
  readonly nodes: readonly PresetNode[]
  readonly edges: readonly PresetEdge[]
}
