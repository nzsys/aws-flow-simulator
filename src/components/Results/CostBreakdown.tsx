import { memo, useMemo } from 'react'
import type { CostResult } from '@/types'

interface CostBreakdownProps {
  readonly cost: CostResult
}

const BAR_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-indigo-500',
] as const

function CostBreakdownComponent({ cost }: CostBreakdownProps) {
  const maxAmount = useMemo(
    () =>
      cost.breakdown.reduce(
        (max, item) => Math.max(max, item.amount),
        0
      ),
    [cost.breakdown]
  )

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon bg-green-100 text-green-700">
          $
        </div>
        <h3>Cost</h3>
      </div>

      <div className="mb-1 rounded-md bg-green-50 px-3 py-2">
        <p className="text-xs text-slate-500">Monthly Cost</p>
        <p className="text-2xl font-bold text-green-700">
          ${cost.monthly.toFixed(2)}
        </p>
      </div>

      <p className="mb-4 text-xs text-slate-500">
        Per-request: ${cost.perRequest.toFixed(6)}
      </p>

      {cost.breakdown.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Breakdown</p>
          {cost.breakdown.map((item, index) => {
            const widthPercent =
              maxAmount > 0
                ? Math.max(2, (item.amount / maxAmount) * 100)
                : 0
            const barColor = BAR_COLORS[index % BAR_COLORS.length]

            return (
              <div key={item.service} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{item.service}</span>
                  <span className="font-medium text-slate-800">
                    ${item.amount.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${barColor}`}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const CostBreakdown = memo(CostBreakdownComponent)
