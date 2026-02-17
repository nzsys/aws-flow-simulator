import type { AWSServiceType, ServiceConfig } from '@/types'
import { SERVICE_DEFINITIONS } from '@/lib/constants/services'
import { getConnectionProtocol } from '@/lib/validation/rules'
import type { PresetNode, PresetEdge } from './types'

type MakeNodeOptions = {
  readonly parentId?: string
  readonly subnetType?: 'public' | 'private'
  readonly configOverrides?: Partial<ServiceConfig>
  readonly style?: { readonly width?: number; readonly height?: number }
}

export function makeNode(
  id: string,
  serviceType: AWSServiceType,
  x: number,
  y: number,
  options?: MakeNodeOptions,
): PresetNode {
  const def = SERVICE_DEFINITIONS[serviceType]
  const nodeType =
    serviceType === 'vpc' ? 'vpcGroup' : serviceType === 'subnet' ? 'subnetGroup' : 'awsService'

  const config = options?.configOverrides
    ? { ...def.defaultConfig, ...options.configOverrides }
    : def.defaultConfig

  const data: PresetNode['data'] = {
    serviceType,
    config,
    label: def.label,
    ...(options?.subnetType ? { subnetType: options.subnetType } : {}),
  }

  return {
    id,
    type: nodeType,
    position: { x, y },
    data,
    ...(options?.parentId ? { parentId: options.parentId, extent: 'parent' as const } : {}),
    ...(options?.style ? { style: options.style } : {}),
  }
}

export function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceType: AWSServiceType,
  targetType: AWSServiceType,
): PresetEdge {
  return {
    id,
    source,
    target,
    type: 'flow',
    animated: true,
    data: { protocol: getConnectionProtocol(sourceType, targetType) },
  }
}
