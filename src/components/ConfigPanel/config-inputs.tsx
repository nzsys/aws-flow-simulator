import type { ChangeEvent } from 'react'

type SelectOption = {
  readonly value: string
  readonly label: string
}

export function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string
  readonly value: string
  readonly options: readonly SelectOption[]
  readonly onChange: (value: string) => void
}) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value)
  }

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-600">{label}</span>
      <select
        value={value}
        onChange={handleChange}
        className="input-compact"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function NumberInput({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  unit,
}: {
  readonly label: string
  readonly value: number | undefined
  readonly onChange: (v: number) => void
  readonly step?: number
  readonly min?: number
  readonly max?: number
  readonly unit?: string
}) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const parsed = parseFloat(event.target.value)
    if (!Number.isNaN(parsed)) {
      onChange(parsed)
    }
  }

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value ?? ''}
          onChange={handleChange}
          step={step}
          min={min}
          max={max}
          className="input-compact w-full"
        />
        {unit ? <span className="shrink-0 text-xs text-gray-400">{unit}</span> : null}
      </div>
    </label>
  )
}

export function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  readonly label: string
  readonly checked: boolean
  readonly onChange: (v: boolean) => void
}) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.checked)
  }

  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-xs text-gray-700">{label}</span>
    </label>
  )
}
