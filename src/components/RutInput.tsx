import { useState, useEffect } from 'react'
import { formatRutInput, validateRut, cleanRut } from '../lib/rut-validator'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

interface RutInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  name?: string
  showValidation?: boolean
  helpText?: string
}

/**
 * Campo de entrada especializado para RUT chileno con validación y formato automático.
 * Formatea mientras se escribe (12.345.678-9) y valida dígito verificador.
 * Muestra indicadores visuales de validación (checkmark verde / cruz roja).
 * 
 * @param value - Valor actual del RUT
 * @param onChange - Callback al cambiar el valor
 * @param label - Etiqueta del campo (default: 'RUT')
 * @param required - Si el campo es obligatorio
 * @param disabled - Si el campo está deshabilitado
 * @param placeholder - Placeholder (default: '12.345.678-9')
 * @param name - Nombre del input (default: 'rut')
 * @param showValidation - Mostrar iconos de validación (default: true)
 * @param helpText - Texto de ayuda opcional
 * 
 * @example
 * <RutInput
 *   value={rut}
 *   onChange={setRut}
 *   required
 *   helpText="Ingresa tu RUT sin puntos ni guión"
 * />
 */
export default function RutInput({
  value,
  onChange,
  label = 'RUT',
  required = false,
  disabled = false,
  placeholder = '12.345.678-9',
  name = 'rut',
  showValidation = true,
  helpText,
}: RutInputProps) {
  const [focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(false)
  
  const cleaned = cleanRut(value || '')
  const isValid = cleaned.length >= 2 ? validateRut(value || '') : null
  const showError = touched && !focused && cleaned.length > 0 && !isValid
  const showSuccess = touched && cleaned.length > 0 && isValid

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const formatted = formatRutInput(input)
    onChange(formatted)
  }

  const handleBlur = () => {
    setFocused(false)
    setTouched(true)
  }

  const handleFocus = () => {
    setFocused(true)
  }

  useEffect(() => {
    if (cleaned.length > 0 && !touched) {
      setTouched(true)
    }
  }, [cleaned, touched])

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      
      <div className="relative">
        <input
          id={name}
          name={name}
          type="text"
          value={value || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={12}
          className={`w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500 ${
            showError
              ? 'border-rose-500 bg-rose-50'
              : showSuccess
              ? 'border-green-500 bg-green-50'
              : 'border-slate-300'
          }`}
        />
        
        {showValidation && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {showError && (
              <XCircle className="h-5 w-5 text-rose-500" />
            )}
            {showSuccess && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {!touched && cleaned.length === 0 && required && (
              <AlertCircle className="h-5 w-5 text-slate-400" />
            )}
          </div>
        )}
      </div>

      {helpText && !showError && (
        <p className="text-xs text-slate-600">{helpText}</p>
      )}
      
      {showError && (
        <p className="text-xs text-rose-600">
          RUT inválido. Verifica el número y dígito verificador.
        </p>
      )}
      
      {showSuccess && showValidation && (
        <p className="text-xs text-green-600">
          ✓ RUT válido
        </p>
      )}
    </div>
  )
}
