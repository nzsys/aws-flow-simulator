import type { Node } from '@xyflow/react'
import type { AWSServiceType, ServiceConfig } from '@/types'
import { isInfrastructureService } from '@/lib/constants/services'

export type ServiceNodeData = {
  readonly serviceType: AWSServiceType
  readonly config: ServiceConfig
  readonly label: string
  readonly [key: string]: unknown
}

export function getNodeData(node: Node): ServiceNodeData {
  return node.data as ServiceNodeData
}

export function getNodeConfig(node: Node): ServiceConfig {
  return getNodeData(node).config
}

export function getServiceType(node: Node): AWSServiceType {
  return getNodeData(node).serviceType
}

export function isFlowNode(node: Node): boolean {
  return !isInfrastructureService(getServiceType(node))
}
