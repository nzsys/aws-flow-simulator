import { useSimulationStore } from '@/store/simulation'
import { PerformanceMetrics } from './PerformanceMetrics'
import { CostBreakdown } from './CostBreakdown'
import { SecurityScore } from './SecurityScore'
import { ValidationPanel } from './ValidationPanel'
import type { AvailabilityResult } from '@/types'
import { memo } from 'react'

type AvailabilityCardProps = {
  readonly availability: AvailabilityResult
}

function AvailabilityCardComponent({ availability }: AvailabilityCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon bg-purple-100 text-purple-700">
          A
        </div>
        <h3>Availability</h3>
      </div>

      <div className="mb-4 rounded-md bg-purple-50 px-3 py-2">
        <p className="text-xs text-slate-500">Estimated Uptime</p>
        <p className="text-2xl font-bold text-purple-700">
          {(availability.estimatedUptime * 100).toFixed(1)}
          <span className="ml-1 text-sm font-normal">%</span>
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-slate-500">Redundancy Score</span>
        <span className="font-medium text-slate-800">{availability.redundancyScore}%</span>
      </div>

      {availability.singlePointsOfFailure.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-red-600">Single Points of Failure</p>
          <ul className="space-y-1">
            {availability.singlePointsOfFailure.map((spof) => (
              <li key={spof} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                {spof}
              </li>
            ))}
          </ul>
        </div>
      )}

      {availability.singlePointsOfFailure.length === 0 && (
        <p className="text-xs text-green-600">No single points of failure detected</p>
      )}
    </div>
  )
}

const AvailabilityCard = memo(AvailabilityCardComponent)

export function ResultsDashboard() {
  const results = useSimulationStore((s) => s.results)

  if (!results) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12">
        <p className="text-sm text-slate-500">シミュレーションを実行して結果を表示</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h2 className="mb-4 text-base font-semibold text-slate-800">Simulation Results</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <PerformanceMetrics performance={results.performance} />
        <CostBreakdown cost={results.cost} />
        <SecurityScore security={results.security} />
        <AvailabilityCard availability={results.availability} />
        {results.validation && <ValidationPanel validation={results.validation} />}
      </div>
    </div>
  )
}
