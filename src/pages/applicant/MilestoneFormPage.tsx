import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import RutInput from '../../components/RutInput'
import FileUpload from '../../components/FileUpload'
import { Send, ArrowLeft, CheckCircle2, Eye } from 'lucide-react'
import { filesService } from '../../services/files.service'

type FieldType =
  | 'text'
  | 'number'
  | 'decimal'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'file'
  | 'image'

interface FormOption {
  value: string
  label: string
}

interface FormField {
  id: string
  name: string
  label: string
  type: FieldType
  helpText?: string
  required?: boolean
  active?: boolean
  readOnly?: boolean
  placeholder?: string
  min?: number
  max?: number
  step?: number
  options?: FormOption[]
  multiple?: boolean
  maxLength?: number
}

interface FormSection {
  id: string
  title: string
  description?: string
  commentBox?: boolean
  fields: FormField[]
}

interface FormSchema {
  id: string
  title: string
  year?: number
  sections: FormSection[]
}

interface MilestoneData {
  id: string
  milestoneId: string
  milestoneName: string
  orderIndex: number
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  whoCanFill: string
  formId: string
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function MilestoneFormPage() {
  const { milestoneProgressId } = useParams<{ milestoneProgressId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const applicationId = searchParams.get('app')
  const isReadOnly = searchParams.get('readonly') === 'true'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [milestone, setMilestone] = useState<MilestoneData | null>(null)
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  
  // Estado para archivos pendientes de subir
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({})
  
  // Estados para cambio de contraseña
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const token = localStorage.getItem('fcg.access_token') ?? ''
  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token],
  )

  // Auto-guardar cuando cambian los valores (con debounce)
  useEffect(() => {
    if (isReadOnly || !milestone || !applicationId) return
    
    const timeoutId = setTimeout(() => {
      // Auto-guardar después de 2 segundos de inactividad
      if (Object.keys(values).length > 0) {
        onSaveDraft()
      }
    }, 2000)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, isReadOnly, milestone, applicationId])

  // Auto-guardar al salir de la página
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isReadOnly && milestone && applicationId) {
        // Intentar guardar antes de salir (usando sendBeacon para ser más confiable)
        const payload = {
          applicationId,
          milestoneId: milestone.milestoneId,
          formId: milestone.formId,
          answers: values,
        }
        
        const url = submissionId 
          ? `${API_BASE}/form-submissions/${submissionId}`
          : `${API_BASE}/form-submissions`
        
        // sendBeacon solo funciona con POST, así que usamos un endpoint específico
        navigator.sendBeacon(
          url,
          new Blob([JSON.stringify(submissionId ? { answers: values } : payload)], {
            type: 'application/json'
          })
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isReadOnly, milestone, applicationId, values, submissionId])

  useEffect(() => {
    if (!milestoneProgressId || !applicationId) {
      setError('Falta información del hito o aplicación')
      setLoading(false)
      return
    }
    loadMilestoneForm()
  }, [milestoneProgressId, applicationId])

  async function loadMilestoneForm() {
    try {
      setLoading(true)
      setError(null)

      // 1. Obtener información del milestone_progress
      const progressRes = await fetch(
        `${API_BASE}/milestones/progress/${applicationId}`,
        { headers }
      )
      if (!progressRes.ok) throw new Error(await safeError(progressRes))
      
      const progressData = await progressRes.json()
      const currentMilestone = progressData.progress.find(
        (m: any) => m.mp_id === milestoneProgressId
      )
      
      if (!currentMilestone) {
        throw new Error('Hito no encontrado')
      }
      
      setMilestone(currentMilestone)

      // 2. Cargar esquema del formulario
      const formRes = await fetch(`${API_BASE}/forms/${currentMilestone.formId}`, {
        headers,
      })
      if (!formRes.ok) throw new Error(await safeError(formRes))
      const formData = await formRes.json()
      
      // Parsear el schema si viene como string
      let formSchema = typeof formData.schema === 'string' 
        ? JSON.parse(formData.schema) 
        : formData.schema
      
      // Normalizar tipos de campos del backend a tipos del frontend
      formSchema = {
        ...formSchema,
        sections: formSchema.sections.map((section: any) => ({
          ...section,
          fields: section.fields.map((field: any) => {
            let normalizedType = field.type.toLowerCase()
            // Convertir tipos del backend a tipos del frontend
            if (normalizedType === 'input') normalizedType = 'text'
            if (normalizedType === 'number') normalizedType = 'decimal'
            if (normalizedType === 'textarea') normalizedType = 'textarea'
            if (normalizedType === 'select') normalizedType = 'select'
            if (normalizedType === 'file') normalizedType = 'file'
            if (normalizedType === 'date') normalizedType = 'date'
            
            // Extraer validaciones numéricas si existen
            const validation = field.validation || {}
            
            return {
              ...field,
              id: field.id || field.name,
              type: normalizedType,
              active: field.active !== false,
              min: validation.min,
              max: validation.max,
              step: validation.step,
              decimalSeparator: validation.decimalSeparator
            }
          })
        }))
      }
      
      console.log('[MilestoneForm] Normalized schema:', formSchema)
      setSchema(formSchema)

      // 3. Cargar respuestas existentes si hay (buscar por milestoneId, no por progress_id)
      const submissionsRes = await fetch(
        `${API_BASE}/form-submissions/milestone/${currentMilestone.milestoneId}`,
        { headers }
      )
      
      if (submissionsRes.ok) {
        const submissions = await submissionsRes.json()
        // Filtrar por applicationId y que tengan datos válidos (formId y answers)
        const mySubmissions = submissions
          .filter((s: any) => 
            s.applicationId === applicationId && 
            s.formId && 
            s.answers && 
            Object.keys(s.answers).length > 0
          )
          .sort((a: any, b: any) => {
            // Priorizar las que tienen submittedAt
            if (a.submittedAt && !b.submittedAt) return -1
            if (!a.submittedAt && b.submittedAt) return 1
            // Si ambas tienen o no tienen submittedAt, ordenar por createdAt
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          })
        
        if (mySubmissions.length > 0) {
          const latest = mySubmissions[0]
          setSubmissionId(latest.id)
          
          console.log('[MilestoneForm] Latest submission:', latest)
          console.log('[MilestoneForm] Answers:', latest.answers)
          
          // 4. Inicializar valores: combinar respuestas guardadas con valores por defecto
          const initial: Record<string, any> = { ...(latest.answers || {}) }
          console.log('[MilestoneForm] Initial values from answers:', initial)
          
          for (const sec of formSchema.sections || []) {
            for (const f of sec.fields) {
              if (f.active === false) continue
              if (initial[f.name] === undefined || initial[f.name] === null) {
                initial[f.name] = defaultValueFor(f)
              }
            }
          }
          console.log('[MilestoneForm] Final values after defaults:', initial)
          setValues(initial)
        } else {
          // No hay submissions, inicializar con valores por defecto
          const initial: Record<string, any> = {}
          for (const sec of formSchema.sections || []) {
            for (const f of sec.fields) {
              if (f.active === false) continue
              initial[f.name] = defaultValueFor(f)
            }
          }
          setValues(initial)
        }
      } else {
        // Error al cargar submissions, inicializar con valores por defecto
        const initial: Record<string, any> = {}
        for (const sec of formSchema.sections || []) {
          for (const f of sec.fields) {
            if (f.active === false) continue
            initial[f.name] = defaultValueFor(f)
          }
        }
        setValues(initial)
      }
    } catch (err: any) {
      setError(err.message ?? 'No se pudo cargar el formulario')
    } finally {
      setLoading(false)
    }
  }

  async function onSaveDraft() {
    if (!milestoneProgressId || !applicationId || !milestone) return
    setSaving(true)
    setError(null)
    
    try {
      const payload = {
        applicationId,
        milestoneId: milestone.milestoneId, // Usar el milestoneId real, no el progress_id
        formId: milestone.formId,
        answers: values,
      }

      if (submissionId) {
        // Actualizar
        const res = await fetch(`${API_BASE}/form-submissions/${submissionId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ answers: values }),
        })
        if (!res.ok) throw new Error(await safeError(res))
      } else {
        // Crear
        const res = await fetch(`${API_BASE}/form-submissions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(await safeError(res))
        const created = await res.json()
        setSubmissionId(created.id)
      }
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    setPasswordError('')
    setPasswordSuccess(false)

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden')
      return
    }

    setChangingPassword(true)

    try {
      const res = await fetch(`${API_BASE}/users/change-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ newPassword }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Error al cambiar contraseña')
      }

      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      
      setTimeout(() => setPasswordSuccess(false), 5000)
    } catch (err: any) {
      setPasswordError(err.message || 'Error al cambiar la contraseña')
    } finally {
      setChangingPassword(false)
    }
  }

  async function onSubmit() {
    // Validar que todos los campos requeridos estén completos
    if (progress < 100) {
      setError('Debes completar todos los campos requeridos antes de enviar el formulario')
      return
    }

    setSubmitting(true)
    setError(null)
    
    try {
      // 1. Subir todos los archivos pendientes
      if (Object.keys(pendingFiles).length > 0) {
        const uploadedFileIds: Record<string, string> = {}
        
        for (const [fieldName, file] of Object.entries(pendingFiles)) {
          try {
            const uploadedFile = await filesService.upload(
              {
                file,
                category: 'FORM_FIELD',
                entityType: 'APPLICATION',
                entityId: applicationId!,
                description: `${fieldName} - Submission: ${submissionId || 'pending'}`
              },
              token
            )
            uploadedFileIds[fieldName] = uploadedFile.file.id
          } catch (err: any) {
            throw new Error(`Error al subir ${fieldName}: ${err.message}`)
          }
        }
        
        // Actualizar valores con los IDs de archivos subidos
        setValues(prev => {
          const updated = { ...prev }
          for (const [fieldName, fileId] of Object.entries(uploadedFileIds)) {
            updated[fieldName] = fileId
          }
          return updated
        })
        
        // Limpiar archivos pendientes
        setPendingFiles({})
      }

      // 2. Guardar antes de enviar (auto-save ya debería haberlo hecho, pero por seguridad)
      await onSaveDraft()

      if (!submissionId) {
        setError('Error: No se pudo crear la presentación del formulario')
        return
      }

      // 3. Marcar como enviado - esto cambiará el milestone a COMPLETED
      const res = await fetch(`${API_BASE}/form-submissions/${submissionId}/submit`, {
        method: 'POST',
        headers,
      })
      if (!res.ok) throw new Error(await safeError(res))

      // 4. Redirigir al dashboard
      navigate('/applicant', { replace: true })
    } catch (err: any) {
      setError(err.message ?? 'No se pudo enviar el formulario')
    } finally {
      setSubmitting(false)
    }
  }

  function onChange(name: string, next: any) {
    if (isReadOnly) return // No permitir cambios en modo solo lectura
    setValues((s) => ({ ...s, [name]: next }))
  }

  const progress = useMemo(() => {
    if (!schema) return 0
    const allFields = schema.sections.flatMap(s => s.fields.filter(f => f.active !== false && f.required))
    if (allFields.length === 0) return 100
    const filled = allFields.filter(f => {
      const val = values[f.name]
      if (Array.isArray(val)) return val.length > 0
      // Considerar archivos pendientes como completados
      if (val === '__PENDING__') return true
      return val !== '' && val !== null && val !== undefined
    })
    return Math.round((filled.length / allFields.length) * 100)
  }, [schema, values])

  const isSectionComplete = (section: FormSection): boolean => {
    const requiredFields = section.fields.filter(f => f.active !== false && f.required)
    if (requiredFields.length === 0) return true
    return requiredFields.every(f => {
      const val = values[f.name]
      if (Array.isArray(val)) return val.length > 0
      // Considerar archivos pendientes como completados
      if (val === '__PENDING__') return true
      return val !== '' && val !== null && val !== undefined
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="card animate-slide-up">
            <div className="card-body flex items-center gap-4">
              <div className="spinner text-sky-600"></div>
              <p className="text-gray-600">Cargando formulario...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="alert alert-error animate-slide-down">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <Link to="/applicant" className="btn btn-outline mt-4">
            <ArrowLeft className="h-5 w-5" />
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  if (!schema || !milestone) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <Link to="/applicant" className="btn btn-ghost mb-6 inline-flex">
            <ArrowLeft className="h-5 w-5" />
            Volver
          </Link>
          
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-sky-100">
                  <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-sky-600 px-2 py-0.5 bg-sky-100 rounded">
                      Hito {milestone.orderIndex}
                    </span>
                    {isReadOnly && (
                      <span className="badge badge-neutral">
                        <Eye className="h-3 w-3" />
                        Solo lectura
                      </span>
                    )}
                    {milestone.status === 'COMPLETED' && (
                      <span className="badge badge-success">
                        <CheckCircle2 className="h-3 w-3" />
                        Completado
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900">{milestone.milestoneName}</h1>
                  <p className="text-gray-600 mt-1">{schema.title}</p>
                </div>
              </div>
              
              <p className="text-gray-600">
                {isReadOnly 
                  ? 'Aquí puedes revisar las respuestas que enviaste en este hito.'
                  : 'Completa todas las secciones obligatorias. Puedes guardar como borrador y continuar más tarde.'
                }
              </p>
            </div>

            {/* Progress card */}
            {!isReadOnly && (
              <div className="card min-w-[280px] hover:shadow-lg transition-shadow duration-300">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">Tu progreso</span>
                    <span className={`text-2xl font-bold ${progress === 100 ? 'text-emerald-600' : 'text-sky-600'}`}>
                      {progress}%
                    </span>
                  </div>
                  <div className="progress">
                    <div
                      className={`progress-bar ${progress === 100 ? 'progress-bar-success' : ''}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {progress === 100 && (
                    <div className="mt-3 flex items-center gap-2 text-emerald-600 animate-scale-in">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium">¡Formulario completo!</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Stepper */}
        {schema.sections.length > 1 && (
          <div className="mb-8 card p-6 animate-slide-up">
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              {schema.sections.map((sec, index) => {
                const isComplete = isSectionComplete(sec)
                const isActive = index === currentStep
                const isAccessible = index <= currentStep || isComplete || isReadOnly
                
                return (
                  <div key={sec.id} className="flex items-center flex-shrink-0">
                    <button
                      onClick={() => isAccessible && setCurrentStep(index)}
                      disabled={!isAccessible}
                      className={`group flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 ${
                        isActive
                          ? 'bg-sky-50 ring-2 ring-sky-600 ring-offset-2 scale-105'
                          : isComplete
                          ? 'hover:bg-emerald-50 cursor-pointer'
                          : !isAccessible
                          ? 'cursor-not-allowed opacity-50'
                          : 'hover:bg-gray-100 cursor-pointer'
                      }`}
                    >
                      <div
                        className={`relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                          isActive
                            ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 scale-110'
                            : isComplete
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className={`text-xs font-medium text-center max-w-[100px] ${
                        isActive ? 'text-sky-700' : isComplete ? 'text-emerald-700' : 'text-gray-600'
                      }`}>
                        {sec.title}
                      </span>
                    </button>
                    
                    {index < schema.sections.length - 1 && (
                      <div className={`h-0.5 w-8 mx-2 transition-all duration-500 ${
                        isComplete ? 'bg-emerald-600' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Sección de cambio de contraseña (solo en primer hito y no readonly) */}
        {milestone && milestone.orderIndex === 1 && !isReadOnly && (
          <section className="card mb-6 border-2 border-amber-200 bg-amber-50/50">
            <div className="card-header bg-gradient-to-r from-amber-100 to-amber-50 border-b border-amber-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-200">
                  <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Cambiar Contraseña (Opcional)
                  </h3>
                  <p className="text-sm text-gray-600">
                    Puedes cambiar tu contraseña temporal por una personalizada
                  </p>
                </div>
              </div>
            </div>

            <div className="card-body">
              {passwordSuccess && (
                <div className="alert alert-success mb-4 animate-fade-in">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Contraseña actualizada exitosamente</span>
                </div>
              )}

              {passwordError && (
                <div className="alert alert-error mb-4 animate-shake">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text font-medium">Nueva Contraseña</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-medium">Confirmar Contraseña</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="Repite tu contraseña"
                    minLength={6}
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  className="btn btn-warning"
                >
                  {changingPassword ? (
                    <>
                      <span className="spinner"></span>
                      Cambiando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Cambiar Contraseña
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Sección actual */}
        {schema.sections[currentStep] && (
          <section className="card animate-fade-in hover:shadow-lg transition-shadow duration-300">
            <div className="card-header bg-gradient-to-r from-sky-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-100">
                  <span className="text-lg font-bold text-sky-600">
                    {currentStep + 1}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {schema.sections[currentStep].title}
                  </h2>
                  {schema.sections[currentStep].description && (
                    <p className="mt-1 text-gray-600">{schema.sections[currentStep].description}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="card-body">
              <div className="grid gap-6 md:grid-cols-2">
                {schema.sections[currentStep].fields
                  .filter((f) => f.active !== false)
                  .map((f) => (
                    <FieldControl
                      key={f.id}
                      field={f}
                      value={values[f.name]}
                      onChange={onChange}
                      applicationId={applicationId || undefined}
                      token={token}
                      readOnly={isReadOnly || f.readOnly}
                      setPendingFiles={setPendingFiles}
                      pendingFiles={pendingFiles}
                    />
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* Navegación */}
        {!isReadOnly && (
          <div className="mt-8 card sticky bottom-4 shadow-strong animate-slide-up">
            <div className="card-body">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="btn btn-outline"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Anterior
                </button>

                <div className="flex items-center gap-3 flex-wrap">
                  {saving && (
                    <span className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="spinner"></span>
                      Guardando automáticamente...
                    </span>
                  )}

                  {currentStep === schema.sections.length - 1 ? (
                    <button
                      onClick={onSubmit}
                      disabled={submitting || saving || progress < 100}
                      className="btn btn-success relative"
                    >
                      {submitting ? (
                        <>
                          <span className="spinner"></span>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          Enviar formulario
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentStep(Math.min(schema.sections.length - 1, currentStep + 1))}
                      className="btn btn-primary"
                    >
                      Siguiente
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {isReadOnly && (
          <div className="mt-8 card">
            <div className="card-body">
              <div className="flex items-center justify-center gap-4">
                <Link to="/applicant" className="btn btn-primary">
                  <ArrowLeft className="h-5 w-5" />
                  Volver al inicio
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FieldControl({
  field,
  value,
  onChange,
  applicationId,
  token,
  readOnly,
  setPendingFiles,
  pendingFiles,
}: {
  field: FormField
  value: any
  onChange: (name: string, next: any) => void
  applicationId?: string
  token?: string
  readOnly?: boolean
  setPendingFiles?: React.Dispatch<React.SetStateAction<Record<string, File>>>
  pendingFiles?: Record<string, File>
}) {
  // Inicializar fileState con el archivo de pendingFiles si existe
  const [fileState, setFileState] = useState<{ file: File | null; uploading: boolean; error?: string; fileId?: string }>(() => {
    const existingFile = pendingFiles && field.name in pendingFiles ? pendingFiles[field.name] : null
    return {
      file: existingFile,
      uploading: false
    }
  })
  
  // Sincronizar el estado del archivo con pendingFiles cuando cambie
  React.useEffect(() => {
    if (pendingFiles && field.name in pendingFiles) {
      const pendingFile = pendingFiles[field.name]
      setFileState(prev => {
        // Solo actualizar si el archivo ha cambiado
        if (prev.file !== pendingFile) {
          return { ...prev, file: pendingFile }
        }
        return prev
      })
    } else if (!pendingFiles || !(field.name in pendingFiles)) {
      // Si no hay archivo en pendingFiles, limpiar el estado
      setFileState(prev => {
        if (prev.file !== null) {
          return { file: null, uploading: false }
        }
        return prev
      })
    }
  }, [pendingFiles, field.name])
  
  const {
    name,
    label,
    type,
    helpText,
    required,
    placeholder,
    min,
    max,
    step,
    options,
    multiple,
    maxLength,
  } = field

  const common = {
    id: name,
    name,
    required: !!required,
    disabled: !!readOnly,
    placeholder,
  }

  if (name === 'rut' || name.toLowerCase().includes('rut')) {
    return (
      <RutInput
        value={value || ''}
        onChange={(val) => onChange(name, val)}
        label={label}
        required={required}
        disabled={readOnly}
        placeholder={placeholder}
        name={name}
        helpText={helpText}
      />
    )
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label} {required && <span className="text-rose-600">*</span>}
        {readOnly && <span className="text-gray-500 text-xs ml-2">(solo lectura)</span>}
      </label>

      {type === 'text' && (
        <input
          {...common}
          type="text"
          maxLength={maxLength}
          value={value ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            readOnly ? 'bg-gray-50 text-gray-600' : ''
          }`}
        />
      )}

      {type === 'number' && (
        <>
          <input
            {...common}
            type="number"
            min={min}
            max={max}
            step={1}
            value={value ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : Number(e.target.value)
              onChange(name, val)
            }}
            onBlur={(e) => {
              const val = Number(e.target.value)
              if (isNaN(val)) return
              
              if (min !== undefined && val < min) {
                alert(`El valor debe ser mayor o igual a ${min}`)
                onChange(name, min)
                e.target.value = String(min)
              } else if (max !== undefined && val > max) {
                alert(`El valor debe ser menor o igual a ${max}`)
                onChange(name, max)
                e.target.value = String(max)
              }
            }}
            className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              readOnly ? 'bg-gray-50 text-gray-600' : ''
            }`}
          />
          {(min !== undefined || max !== undefined) && (
            <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              {min !== undefined && max !== undefined
                ? `Rango permitido: ${min} - ${max}`
                : min !== undefined
                ? `Valor mínimo: ${min}`
                : `Valor máximo: ${max}`
              }
            </p>
          )}
        </>
      )}

      {type === 'decimal' && (
        <>
          <input
            {...common}
            type="number"
            min={min}
            max={max}
            step={step ?? 0.01}
            value={value ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : Number(e.target.value)
              onChange(name, val)
            }}
            onBlur={(e) => {
              const val = Number(e.target.value)
              if (isNaN(val)) return
              
              if (min !== undefined && val < min) {
                alert(`El valor debe ser mayor o igual a ${min}`)
                onChange(name, min)
                e.target.value = String(min)
              } else if (max !== undefined && val > max) {
                alert(`El valor debe ser menor o igual a ${max}`)
                onChange(name, max)
                e.target.value = String(max)
              }
            }}
            className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              readOnly ? 'bg-gray-50 text-gray-600' : ''
            }`}
          />
          {(min !== undefined || max !== undefined) && (
            <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              {min !== undefined && max !== undefined
                ? `Rango permitido: ${min} - ${max}`
                : min !== undefined
                ? `Valor mínimo: ${min}`
                : `Valor máximo: ${max}`
              }
            </p>
          )}
        </>
      )}

      {type === 'textarea' && (
        <textarea
          {...common}
          rows={4}
          maxLength={maxLength}
          value={value ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            readOnly ? 'bg-gray-50 text-gray-600' : ''
          }`}
        />
      )}

      {type === 'date' && (
        <input
          {...common}
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            readOnly ? 'bg-gray-50 text-gray-600' : ''
          }`}
        />
      )}

      {type === 'select' && (
        <select
          {...common}
          value={value ?? (multiple ? [] : '')}
          multiple={!!multiple}
          onChange={(e) => {
            if (multiple) {
              const selected = Array.from(e.target.selectedOptions).map((o) => o.value)
              onChange(name, selected)
            } else {
              onChange(name, e.target.value)
            }
          }}
          className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            readOnly ? 'bg-gray-50 text-gray-600' : ''
          }`}
        >
          {!multiple && <option value="">Seleccione…</option>}
          {(options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {type === 'radio' && (
        <div className="space-y-1">
          {(options ?? []).map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(name, opt.value)}
                disabled={readOnly}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      {type === 'checkbox' && (
        <div className="space-y-1">
          {(options ?? []).map((opt) => {
            const arr: string[] = Array.isArray(value) ? value : []
            const checked = arr.includes(opt.value)
            return (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={name}
                  value={opt.value}
                  checked={checked}
                  onChange={(e) => {
                    const next = new Set(arr)
                    if (e.target.checked) next.add(opt.value)
                    else next.delete(opt.value)
                    onChange(name, Array.from(next))
                  }}
                  disabled={readOnly}
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
      )}

      {(type === 'file' || type === 'image') && token && applicationId && !readOnly && setPendingFiles && (
        <FileUpload
          onFileSelect={(file) => {
            // Validar tipo de archivo según el campo
            const allowedTypes: Record<string, string[]> = {
              'file': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
              'image': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
            }
            
            const allowed = allowedTypes[type] || []
            
            // Validar tipo MIME
            if (allowed.length > 0 && !allowed.includes(file.type)) {
              const friendlyTypes = type === 'image' 
                ? 'JPG, PNG, GIF o WebP' 
                : 'PDF o Word'
              setFileState({ 
                file: null, 
                uploading: false, 
                error: `Tipo de archivo no permitido. Solo se aceptan archivos ${friendlyTypes}.` 
              })
              return
            }
            
            // Validar tamaño (10 MB para imágenes, 50 MB para documentos)
            const maxSize = type === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024
            if (file.size > maxSize) {
              const maxMB = Math.floor(maxSize / 1024 / 1024)
              setFileState({ 
                file: null, 
                uploading: false, 
                error: `El archivo es demasiado grande. Tamaño máximo: ${maxMB} MB.` 
              })
              return
            }
            
            // Validación exitosa - guardar el archivo
            setFileState({ file, uploading: false, error: undefined })
            setPendingFiles((prev: Record<string, File>) => ({ ...prev, [name]: file }))
            // Marcar que hay un archivo seleccionado (pero aún no subido)
            onChange(name, '__PENDING__')
          }}
          onFileRemove={() => {
            setFileState({ file: null, uploading: false })
            setPendingFiles((prev: Record<string, File>) => {
              const newFiles = { ...prev }
              delete newFiles[name]
              return newFiles
            })
            onChange(name, null)
          }}
          file={fileState.file}
          isUploading={fileState.uploading}
          error={fileState.error}
          accept={type === 'image' ? 'image/*' : undefined}
          maxSize={10 * 1024 * 1024}
          label={label}
        />
      )}

      {(type === 'file' || type === 'image') && readOnly && value && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-600">Archivo cargado: {value}</p>
        </div>
      )}

      {helpText && <p className="text-xs text-slate-500">{helpText}</p>}
    </div>
  )
}

function defaultValueFor(field: FormField) {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'date':
      return ''
    case 'number':
    case 'decimal':
      return ''
    case 'select':
      return field.multiple ? [] : ''
    case 'radio':
      return ''
    case 'checkbox':
      return []
    case 'file':
    case 'image':
      return null
    default:
      return ''
  }
}

async function safeError(res: Response) {
  try {
    const data = await res.json()
    return data?.message || data?.error || res.statusText
  } catch {
    return res.statusText
  }
}
