import { memo } from 'react'
import type { ValidationResult, ValidationIssue } from '@/lib/validation/validator'

type ValidationPanelProps = {
  readonly validation: ValidationResult
}

const SEVERITY_STYLES = {
  error: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-400',
  },
  warning: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-700',
    dot: 'bg-yellow-400',
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-400',
  },
} as const

function IssueLine({ issue }: { readonly issue: ValidationIssue }) {
  const style = SEVERITY_STYLES[issue.severity]

  return (
    <li className={`flex items-start gap-2 rounded-md px-2 py-1.5 ${style.bg}`}>
      <span className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
      <div className="min-w-0">
        <span className={`text-xs ${style.text}`}>{issue.message}</span>
      </div>
    </li>
  )
}

function ValidationPanelComponent({ validation }: ValidationPanelProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon bg-indigo-100 text-indigo-700">
          V
        </div>
        <h3>Validation</h3>
      </div>

      <div className="mb-3 flex gap-2">
        {validation.errorCount > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            {validation.errorCount} Error{validation.errorCount > 1 ? 's' : ''}
          </span>
        )}
        {validation.warningCount > 0 && (
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            {validation.warningCount} Warning{validation.warningCount > 1 ? 's' : ''}
          </span>
        )}
        {validation.infoCount > 0 && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {validation.infoCount} Info
          </span>
        )}
        {validation.isValid && validation.issues.length === 0 && (
          <span className="text-xs text-green-600">All checks passed</span>
        )}
      </div>

      {validation.issues.length > 0 && (
        <ul className="space-y-1">
          {validation.issues.map((issue, index) => (
            <IssueLine key={`${issue.category}-${index}`} issue={issue} />
          ))}
        </ul>
      )}
    </div>
  )
}

export const ValidationPanel = memo(ValidationPanelComponent)
