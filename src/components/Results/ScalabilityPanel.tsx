import { memo } from 'react'
import type { ScalabilityResult } from '@/types'

type ScalabilityPanelProps = {
  readonly scalability: ScalabilityResult
}

function getHeadroomColor(percent: number): string {
  if (percent > 50) return 'bg-green-500'
  if (percent > 20) return 'bg-yellow-500'
  return 'bg-red-500'
}

function ScalabilityPanelComponent({ scalability }: ScalabilityPanelProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon bg-teal-100 text-teal-700">S</div>
        <h3>Scalability</h3>
      </div>

      <div className="mb-4 rounded-md bg-teal-50 px-3 py-2">
        <p className="text-xs text-slate-500">Max RPS</p>
        <p className="text-2xl font-bold text-teal-700">
          {scalability.maxRPS.toLocaleString()}
        </p>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-slate-500">Headroom</span>
          <span className="font-medium text-slate-800">{scalability.headroomPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100">
          <div
            className={`h-2 rounded-full ${getHeadroomColor(scalability.headroomPercent)}`}
            style={{ width: `${Math.min(100, scalability.headroomPercent)}%` }}
          />
        </div>
      </div>

      {scalability.bottleneckService && (
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-slate-500">Bottleneck</span>
          <span className="font-medium text-red-600">{scalability.bottleneckService}</span>
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            scalability.autoScalingEnabled
              ? 'bg-green-100 text-green-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          AutoScaling {scalability.autoScalingEnabled ? 'ON' : 'OFF'}
        </span>
        {scalability.perService.some((s) => s.isFargate) && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Fargate
          </span>
        )}
      </div>

      {scalability.perService.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-600">Per Service</p>
          {scalability.perService.map((entry) => (
            <div key={entry.service} className="flex items-center justify-between text-xs">
              <span className="text-slate-600">
                {entry.service}
                {entry.isFargate && (
                  <span className="ml-1 text-blue-500">(Fargate)</span>
                )}
              </span>
              <span className="font-medium text-slate-800">
                {entry.maxCapacity.toLocaleString()} RPS
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const ScalabilityPanel = memo(ScalabilityPanelComponent)
