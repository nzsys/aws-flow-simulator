import type { AWSServiceType } from '@/types'
import { INFRASTRUCTURE_SERVICES, SERVICE_DEFINITIONS } from '@/lib/constants/services'
import { ALLOWED_TARGETS, SUBOPTIMAL_CONNECTIONS } from './rules'

export type ConnectionCheckResult = {
  readonly allowed: boolean
  readonly warning?: string
}

export function getServiceLabel(type: AWSServiceType): string {
  return SERVICE_DEFINITIONS[type]?.label ?? type
}

function formatAllowedTargets(targets: readonly AWSServiceType[]): string {
  return targets.map(getServiceLabel).join(', ')
}

function isTerminalService(type: AWSServiceType): boolean {
  const targets = ALLOWED_TARGETS[type]
  return targets !== undefined && targets.length === 0
}

export function isReverseValid(source: AWSServiceType, target: AWSServiceType): boolean {
  const reverseTargets = ALLOWED_TARGETS[target]
  if (!reverseTargets) return true
  return reverseTargets.includes(source)
}

function buildRejectionMessage(sourceType: AWSServiceType, targetType: AWSServiceType): string {
  const sourceLabel = getServiceLabel(sourceType)
  const targetLabel = getServiceLabel(targetType)

  if (isTerminalService(sourceType)) {
    return `${sourceLabel} は終端サービスのため、出力接続はできません`
  }

  const allowedTargets = ALLOWED_TARGETS[sourceType]
  const reverseValid = isReverseValid(sourceType, targetType)

  const parts: string[] = []

  if (reverseValid) {
    parts.push(
      `${sourceLabel} → ${targetLabel} は接続できません（逆方向 ${targetLabel} → ${sourceLabel} は可能です）。`,
    )
  } else {
    parts.push(`${sourceLabel} → ${targetLabel} は接続できません。`)
  }

  if (allowedTargets && allowedTargets.length > 0) {
    parts.push(`${sourceLabel} の接続先: ${formatAllowedTargets(allowedTargets)}`)
  }

  return parts.join('')
}

export function canConnect(
  sourceType: AWSServiceType,
  targetType: AWSServiceType,
): ConnectionCheckResult {
  if (INFRASTRUCTURE_SERVICES.includes(sourceType) || INFRASTRUCTURE_SERVICES.includes(targetType)) {
    if (sourceType === 'nat-gateway' && targetType === 'internet-gateway') {
      return { allowed: true }
    }
    return {
      allowed: false,
      warning: 'インフラサービスはコンテナメント（包含）で配置します。接続ではありません。',
    }
  }

  const allowedTargets = ALLOWED_TARGETS[sourceType]

  if (!allowedTargets) {
    return { allowed: true }
  }

  if (!allowedTargets.includes(targetType)) {
    return { allowed: false, warning: buildRejectionMessage(sourceType, targetType) }
  }

  const suboptimalKey = `${sourceType}->${targetType}`
  const suboptimalMessage = SUBOPTIMAL_CONNECTIONS[suboptimalKey]
  if (suboptimalMessage) {
    return { allowed: true, warning: suboptimalMessage }
  }

  return { allowed: true }
}
