import { memo, useMemo } from 'react'
import type { PerformanceResult } from '@/types'

interface PerformanceMetricsProps {
  readonly performance: PerformanceResult
}

function getLatencyColor(totalLatency: number): string {
  if (totalLatency < 100) {
    return 'text-green-600'
  }
  if (totalLatency < 500) {
    return 'text-yellow-600'
  }
  return 'text-red-600'
}

function getLatencyBgColor(totalLatency: number): string {
  if (totalLatency < 100) {
    return 'bg-green-50'
  }
  if (totalLatency < 500) {
    return 'bg-yellow-50'
  }
  return 'bg-red-50'
}

function PerformanceMetricsComponent({
  performance,
}: PerformanceMetricsProps) {
  const latencyColor = getLatencyColor(performance.totalLatency)
  const latencyBg = getLatencyBgColor(performance.totalLatency)

  const metrics = useMemo(
    () => [
      { label: 'P50 Latency', value: `${performance.p50Latency.toFixed(0)}ms` },
      { label: 'P99 Latency', value: `${performance.p99Latency.toFixed(0)}ms` },
      { label: 'TTFB', value: `${performance.ttfb.toFixed(0)}ms` },
      {
        label: 'Cache Hit Rate',
        value: `${(performance.cacheHitRate * 100).toFixed(1)}%`,
      },
      {
        label: 'Requests to Origin',
        value: performance.requestsReachingOrigin.toFixed(1),
      },
    ] as const,
    [performance]
  )

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon bg-blue-100 text-blue-700">
          P
        </div>
        <h3>Performance</h3>
      </div>

      <div className={`mb-4 rounded-md ${latencyBg} px-3 py-2`}>
        <p className="text-xs text-slate-500">Total Latency</p>
        <p className={`text-2xl font-bold ${latencyColor}`}>
          {performance.totalLatency.toFixed(0)}
          <span className="ml-1 text-sm font-normal">ms</span>
        </p>
      </div>

      <div className="space-y-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-slate-500">{metric.label}</span>
            <span className="font-medium text-slate-800">{metric.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const PerformanceMetrics = memo(PerformanceMetricsComponent)
