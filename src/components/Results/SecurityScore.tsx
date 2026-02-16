import { memo, useMemo } from 'react'
import type { SecurityResult } from '@/types'

interface SecurityScoreProps {
  readonly security: SecurityResult
}

interface SecurityFeature {
  readonly label: string
  readonly enabled: boolean
}

function getScoreBgColor(score: number): string {
  if (score >= 70) {
    return 'bg-green-500'
  }
  if (score >= 40) {
    return 'bg-yellow-500'
  }
  return 'bg-red-500'
}

function getScoreTextColor(score: number): string {
  if (score >= 70) {
    return 'text-green-700'
  }
  if (score >= 40) {
    return 'text-yellow-700'
  }
  return 'text-red-700'
}

function getScoreLabel(score: number): string {
  if (score >= 70) {
    return 'Good'
  }
  if (score >= 40) {
    return 'Fair'
  }
  return 'Poor'
}

function SecurityScoreComponent({ security }: SecurityScoreProps) {
  const features: readonly SecurityFeature[] = useMemo(
    () => [
      { label: 'DDoS Protection', enabled: security.ddosProtection },
      { label: 'WAF Enabled', enabled: security.wafEnabled },
      { label: 'Encryption in Transit', enabled: security.encryptionInTransit },
      { label: 'Encryption at Rest', enabled: security.encryptionAtRest },
    ],
    [security]
  )

  const scoreBg = getScoreBgColor(security.score)
  const scoreText = getScoreTextColor(security.score)
  const scoreLabel = getScoreLabel(security.score)

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon bg-orange-100 text-orange-700">
          S
        </div>
        <h3>Security</h3>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${scoreBg}`}
        >
          <span className="text-xl font-bold text-white">
            {security.score}
          </span>
        </div>
        <div>
          <p className={`text-sm font-semibold ${scoreText}`}>{scoreLabel}</p>
          <p className="text-xs text-slate-500">Security Score</p>
        </div>
      </div>

      <div className="space-y-2">
        {features.map((feature) => (
          <div
            key={feature.label}
            className="flex items-center gap-2 text-sm"
          >
            {feature.enabled ? (
              <svg
                className="h-4 w-4 shrink-0 text-green-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4 shrink-0 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span
              className={
                feature.enabled ? 'text-slate-700' : 'text-slate-400'
              }
            >
              {feature.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const SecurityScore = memo(SecurityScoreComponent)
