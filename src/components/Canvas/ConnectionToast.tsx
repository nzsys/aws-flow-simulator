import { useEffect } from 'react'
import { useUIStore } from '@/store/ui'

const AUTO_DISMISS_MS = 3500

export function ConnectionToast() {
  const feedback = useUIStore((s) => s.connectionFeedback)
  const setConnectionFeedback = useUIStore((s) => s.setConnectionFeedback)

  useEffect(() => {
    if (!feedback) return

    const timer = setTimeout(() => {
      setConnectionFeedback(null)
    }, AUTO_DISMISS_MS)

    return () => clearTimeout(timer)
  }, [feedback, setConnectionFeedback])

  if (!feedback) return null

  const isError = feedback.type === 'error'

  return (
    <div
      role="alert"
      className={`fixed right-4 top-16 z-50 max-w-md rounded-lg px-4 py-2.5 shadow-lg ${
        isError
          ? 'border border-red-200 bg-red-50 text-red-800'
          : 'border border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {isError ? 'Connection Rejected' : 'Warning'}
        </span>
        <span className="text-sm">{feedback.message}</span>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => setConnectionFeedback(null)}
          className={`ml-2 rounded p-0.5 text-xs hover:bg-black/5 ${
            isError ? 'text-red-600' : 'text-amber-600'
          }`}
        >
          &times;
        </button>
      </div>
    </div>
  )
}
