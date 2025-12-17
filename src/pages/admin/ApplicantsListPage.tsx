import { useEffect, useMemo, useState } from 'react'
import { useCall } from '../../contexts/CallContext'
import { useCallContext } from '../../contexts/CallContext'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import { Mail, Copy, X, CheckCircle2, Send, Eye, Edit, Download, FileSpreadsheet, FileText, Key, Trash2 } from 'lucide-react'
import ApplicantDetailModal from '../../components/admin/ApplicantDetailModal'
import BulkInviteModal from '../../components/admin/BulkInviteModal'
import EditApplicantModal from '../../components/admin/EditApplicantModal'
import InstitutionSearchSelector from '../../components/admin/InstitutionSearchSelector'
import { authFetch } from '../../lib/api'
import ExcelJS from 'exceljs'

interface ApplicantRow {
  id: string
  email: string
  fullName?: string
  firstName?: string
  lastName?: string
  rutNumber?: number
  rutDv?: string
  phone?: string | null
  birthDate?: string | null
  address?: string | null
  commune?: string | null
  region?: string | null
  institutionName?: string | null
  institutionCommune?: string | null
  createdAt?: string
}

interface InviteStatus {
  [applicantId: string]: {
    invited: boolean
    method: 'auto' | 'manual'
    timestamp: string
  }
}

interface PageMeta {
  total: number
  limit: number
  offset: number
}

interface ListResponse {
  data: ApplicantRow[]
  meta?: PageMeta
}

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function ApplicantsListPage() {
  const { selectedCallId } = useCall()
  const { selectedCall } = useCallContext()
  const [rows, setRows] = useState<ApplicantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filtros / paginación simples
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)
  const [meta, setMeta] = useState<PageMeta | null>(null)

  // Modal de invitación
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantRow | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [inviteStatuses, setInviteStatuses] = useState<InviteStatus>({})

  // Modal de detalles del postulante
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null)

  // Modal de envío masivo
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false)

  // Modal de edición
  const [editingApplicant, setEditingApplicant] = useState<ApplicantRow | null>(null)

  // Modal de selección de hito para CSV
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false)
  const [availableMilestones, setAvailableMilestones] = useState<any[]>([])
  
  // Modal de selección de formato (Excel/CSV)
  const [formatModalOpen, setFormatModalOpen] = useState(false)
  const [selectedMilestoneForDownload, setSelectedMilestoneForDownload] = useState<any>(null)

  // Modal de código generado rápido
  const [quickCodeModalOpen, setQuickCodeModalOpen] = useState(false)
  const [quickGeneratedCode, setQuickGeneratedCode] = useState<string | null>(null)
  const [quickCodeApplicant, setQuickCodeApplicant] = useState<ApplicantRow | null>(null)
  const [quickCodeLoading, setQuickCodeLoading] = useState(false)
  const [quickCodeError, setQuickCodeError] = useState<string | null>(null)
  const [deletingApplicantId, setDeletingApplicantId] = useState<string | null>(null)

  // Hooks para notificaciones
  const { showSuccess, showError, showWarning } = useToast()
  const { confirm } = useConfirm()

  // crear manualmente (modal simple inline)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    rut: '',
    phone: '',
    birth_date: '',
    address: '',
    commune: '',
    region: '',
    institution_id: '',
  })
  // Campos extra opcionales que el usuario puede agregar dinámicamente
  const [extraFields, setExtraFields] = useState<string[]>([])
  const [createError, setCreateError] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  const headers = useMemo(() => {
    const token = localStorage.getItem('fcg.access_token') ?? ''
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }, [])

  // Función para abrir modal de invitación
  function openInviteModal(applicant: ApplicantRow) {
    if (!selectedCall) {
      showWarning('Selecciona una convocatoria primero')
      return
    }
    setSelectedApplicant(applicant)
    setInviteModalOpen(true)
    setInviteError(null)
    setInviteSuccess(false)
    setGeneratedCode(null)
    setEmailSubject('')
    setEmailBody('')
  }

  // Función para enviar invitación automática
  async function sendAutoInvite() {
    if (!selectedApplicant || !selectedCall) return

    setInviteLoading(true)
    setInviteError(null)

    try {
      const res = await authFetch(`${API_BASE}/invites`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          callId: selectedCall.id,
          firstName: selectedApplicant.firstName,
          lastName: selectedApplicant.lastName,
          email: selectedApplicant.email,
          sendEmail: true,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Error al enviar invitación')
      }

      setInviteSuccess(true)
      setInviteStatuses({
        ...inviteStatuses,
        [selectedApplicant.id]: {
          invited: true,
          method: 'auto',
          timestamp: new Date().toISOString(),
        },
      })

      setTimeout(() => {
        setInviteModalOpen(false)
        setSelectedApplicant(null)
      }, 2000)
    } catch (err: any) {
      setInviteError(err.message || 'Error al enviar invitación')
    } finally {
      setInviteLoading(false)
    }
  }

  // Función para generar código manual
  async function generateManualInvite() {
    if (!selectedApplicant || !selectedCall) return

    setInviteLoading(true)
    setInviteError(null)

    try {
      const res = await authFetch(`${API_BASE}/invites`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          callId: selectedCall.id,
          firstName: selectedApplicant.firstName,
          lastName: selectedApplicant.lastName,
          email: selectedApplicant.email,
          sendEmail: false,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Error al generar código')
      }

      const data = await res.json()
      const code = data.code || data.invitationCode

      setGeneratedCode(code)
      
      // Generar asunto y cuerpo del email
      const name = selectedApplicant.firstName && selectedApplicant.lastName
        ? `${selectedApplicant.firstName} ${selectedApplicant.lastName}`
        : selectedApplicant.fullName || 'Postulante'

      const subject = `Invitación para postular - ${selectedCall.name}`
      const inviteUrl = `${window.location.origin}/#/login`
      
      const body = `¡Hola ${name}!

Has sido invitado/a a postular a ${selectedCall.name} de la Fundación Carmen Goudie.

Datos de acceso:
Email: ${selectedApplicant.email}
Código: ${code}

Para postular, entra a: ${inviteUrl}

Instrucciones:
1. Ingresa al portal de postulaciones
2. Introduce tu código de invitación
3. Crea tu contraseña
4. Completa el formulario

¡Te esperamos!

Fundación Carmen Goudie`

      setEmailSubject(subject)
      setEmailBody(body)

      setInviteStatuses({
        ...inviteStatuses,
        [selectedApplicant.id]: {
          invited: true,
          method: 'manual',
          timestamp: new Date().toISOString(),
        },
      })
    } catch (err: any) {
      setInviteError(err.message || 'Error al generar código')
    } finally {
      setInviteLoading(false)
    }
  }

  // Función para generar código rápido (sin modal de invitación)
  async function generateQuickCode(applicant: ApplicantRow) {
    if (!selectedCall) {
      showWarning('Selecciona una convocatoria primero')
      return
    }

    setQuickCodeApplicant(applicant)
    setQuickCodeModalOpen(true)
    setQuickCodeLoading(true)
    setQuickCodeError(null)
    setQuickGeneratedCode(null)

    try {
      const res = await authFetch(`${API_BASE}/invites`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          callId: selectedCall.id,
          firstName: applicant.firstName,
          lastName: applicant.lastName,
          email: applicant.email,
          sendEmail: false,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Error al generar código')
      }

      const data = await res.json()
      const code = data.code || data.invitationCode

      setQuickGeneratedCode(code)
      setInviteStatuses({
        ...inviteStatuses,
        [applicant.id]: {
          invited: true,
          method: 'manual',
          timestamp: new Date().toISOString(),
        },
      })
    } catch (err: any) {
      setQuickCodeError(err.message || 'Error al generar código')
    } finally {
      setQuickCodeLoading(false)
    }
  }

  /**
   * Eliminar postulante y todos sus datos relacionados
   */
  async function deleteApplicant(applicant: ApplicantRow) {
    const confirmed = await confirm({
      title: 'Eliminar postulante',
      message: `¿Estás seguro de eliminar a ${applicant.fullName || applicant.email}?\n\nEsto eliminará:\n• El usuario y postulante\n• Todas sus postulaciones\n• Formularios enviados\n• Códigos de invitación\n• Archivos asociados\n\nEsta acción NO se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    })
    
    if (!confirmed) return

    setDeletingApplicantId(applicant.id)

    try {
      const res = await authFetch(`${API_BASE}/applicants/delete-by-email/${encodeURIComponent(applicant.email)}`, {
        method: 'DELETE',
        headers,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Error al eliminar postulante')
      }

      // Recargar la lista
      await load()
      
      showSuccess('Postulante eliminado exitosamente')
    } catch (err: any) {
      console.error('Error eliminando postulante:', err)
      showError(`Error al eliminar: ${err.message || 'Error desconocido'}`)
    } finally {
      setDeletingApplicantId(null)
    }
  }

  // Función para regenerar código (si el postulante tuvo problemas)
  async function regenerateInviteCode() {
    if (!selectedApplicant || !selectedCall) return

    const confirmed = await confirm({
      title: 'Regenerar código',
      message: '¿Estás seguro de regenerar el código de invitación? El código anterior dejará de funcionar.',
      confirmText: 'Regenerar',
      cancelText: 'Cancelar',
      type: 'warning'
    })
    if (!confirmed) return

    setInviteLoading(true)
    setInviteError(null)

    try {
      // Generar nuevo código
      await generateManualInvite()
      showSuccess('Código regenerado exitosamente')
    } catch (err: any) {
      setInviteError(err.message || 'Error al regenerar código')
    } finally {
      setInviteLoading(false)
    }
  }

  // Función para copiar al portapapeles
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (q.trim()) params.set('q', q.trim())
      if (selectedCallId) params.set('callId', selectedCallId)

      const res = await authFetch(`${API_BASE}/applicants?${params.toString()}`, {
        headers,
      })
      if (!res.ok) throw new Error(await safeError(res))
      const json = (await res.json()) as ListResponse | ApplicantRow[]

      // Soportar payloads {data,meta} o array directo
      if (Array.isArray(json)) {
        setRows(json)
        setMeta({ total: json.length, limit, offset })
      } else {
        setRows(json.data ?? [])
        setMeta(
          json.meta ?? {
            total: (json.data ?? []).length,
            limit,
            offset,
          },
        )
      }
    } catch (err: any) {
      setError(err.message ?? 'No se pudo cargar el listado')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset, selectedCallId])

  // Función para abrir modal de selección de hito
  async function openMilestoneSelection() {
    if (!selectedCall) {
      showWarning('Selecciona una convocatoria primero')
      return
    }

    try {
      // Obtener los hitos de la convocatoria
      const milestonesRes = await authFetch(
        `${API_BASE}/milestones/call/${selectedCall.id}`,
        { headers }
      )
      if (!milestonesRes.ok) throw new Error('No se pudieron obtener los hitos')
      const milestones = await milestonesRes.json()

      // Filtrar solo hitos con formulario
      const milestonesWithForms = milestones.filter((m: any) => m.formId)
      
      if (milestonesWithForms.length === 0) {
        showWarning('No hay formularios disponibles para descargar')
        return
      }

      // Si solo hay un hito, descargar directamente
      if (milestonesWithForms.length === 1) {
        await downloadCSV(milestonesWithForms[0])
        return
      }

      // Mostrar modal para seleccionar
      setAvailableMilestones(milestonesWithForms)
      setMilestoneModalOpen(true)
    } catch (err: any) {
      showError(`Error: ${err.message}`)
    }
  }

  // Función para mostrar modal de selección de formato
  function showFormatModal(selectedMilestone: any) {
    setMilestoneModalOpen(false)
    setSelectedMilestoneForDownload(selectedMilestone)
    setFormatModalOpen(true)
  }

  // Función para descargar en formato CSV con primera fila destacada
  async function downloadCSV(selectedMilestone: any) {
    if (!selectedCall) return

    try {
      setFormatModalOpen(false)
      console.log('Descargando CSV del hito:', selectedMilestone.name)

      // 3. Obtener el esquema del formulario
      const formRes = await authFetch(
        `${API_BASE}/forms/${selectedMilestone.formId}`,
        { headers }
      )
      if (!formRes.ok) throw new Error('No se pudo obtener el formulario')
      const formData = await formRes.json()

      // 4. Obtener todas las postulaciones CON datos del postulante
      const appsRes = await authFetch(
        `${API_BASE}/applications?callId=${selectedCall.id}&limit=1000`,
        { headers }
      )
      if (!appsRes.ok) throw new Error('No se pudieron obtener las postulaciones')
      const appsData = await appsRes.json()
      const applications = Array.isArray(appsData) ? appsData : appsData.data || []

      // 5. Obtener datos completos de cada postulante
      const applicantsMap = new Map()
      const applicantIds: string[] = [...new Set(applications.map((app: any) => app.applicantId || app.applicant_id).filter((id): id is string => Boolean(id)))]
      const applicantPromises = applicantIds.map((applicantId) =>
        authFetch(`${API_BASE}/admin/applicants/${applicantId}`, { headers })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
      const applicantsData = await Promise.all(applicantPromises)
      
      applicantsData.forEach((data, idx) => {
        if (data) {
          applicantsMap.set(applicantIds[idx], data)
        }
      })

      // 6. Extraer campos del formulario con sus tipos
      const formFields: Array<{
        name: string
        label: string
        type: string
        options?: string[]
      }> = []

      if (formData.schema?.sections && Array.isArray(formData.schema.sections)) {
        for (const section of formData.schema.sections) {
          if (section.fields && Array.isArray(section.fields)) {
            for (const field of section.fields) {
              if (field.visibility !== 'INTERNAL') {
                formFields.push({
                  name: field.name || field.id,
                  label: field.label || field.name || 'Sin título',
                  type: field.type || 'text',
                  options: field.options || []
                })
              }
            }
          }
        }
      }

      console.log('Campos del formulario:', formFields.length)

      // 7. Obtener respuestas de cada aplicación
      console.log(`Obteniendo respuestas de ${applications.length} aplicaciones...`)
      
      const applicationsWithData = await Promise.all(
        applications.map(async (app: any) => {
          const applicant = applicantsMap.get(app.applicantId) || {}
          
          try {
            // Obtener form_submissions de esta aplicación
            const submissionRes = await authFetch(
              `${API_BASE}/form-submissions/application/${app.id}`,
              { headers }
            )
            
            if (submissionRes.ok) {
              const submissions = await submissionRes.json()
              
              // Buscar la submission del hito seleccionado
              let submission
              if (Array.isArray(submissions)) {
                submission = submissions.find((s: any) => 
                  (s.milestone_id || s.milestoneId) === selectedMilestone.id
                )
              }
              
              // Normalizar campos (soportar snake_case y camelCase)
              const answers = submission?.form_data || submission?.formData || submission?.answers || null
              const submitted = submission?.submitted_at || submission?.submittedAt || null
              
              console.log(`App ${app.id.substring(0, 8)}:`, {
                hasSubmission: !!submission,
                hasAnswers: !!answers,
                isSubmitted: !!submitted,
                answerKeys: answers ? Object.keys(answers) : []
              })
              
              return { 
                ...app, 
                applicant,
                answers,
                formSubmitted: !!submitted,
                submittedAt: submitted
              }
            }
            
            return { 
              ...app, 
              applicant,
              answers: null,
              formSubmitted: false
            }
          } catch (error) {
            console.warn(`No se pudieron obtener respuestas para app ${app.id}`)
            return { 
              ...app, 
              applicant,
              answers: null,
              formSubmitted: false
            }
          }
        })
      )

      // 8. Construir las filas del CSV
      const csvRows: string[][] = []
      
      // ENCABEZADOS: Datos del usuario + Campos del formulario
      const userHeaders = [
        'Nombre Completo',
        'Email',
        'RUT',
        'Teléfono',
        'Fecha de Nacimiento',
        'Dirección',
        'Comuna',
        'Región',
        'Institución',
        'Comuna Institución',
        'Fecha de Registro',
        'Estado Formulario'
      ]
      
      const formHeaders = formFields.map(f => f.label)
      csvRows.push([...userHeaders, ...formHeaders])

      // FILAS: Datos de cada postulante
      for (const app of applicationsWithData) {
        const row: string[] = []
        const applicant = app.applicant || {}
        
        // DATOS DEL USUARIO (orden jerárquico)
        row.push(applicant.fullName || `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim() || 'Sin nombre')
        row.push(applicant.email || 'Sin email')
        row.push(applicant.rutNumber && applicant.rutDv ? `${applicant.rutNumber}-${applicant.rutDv}` : 'Sin RUT')
        row.push(applicant.phone || 'Sin teléfono')
        row.push(applicant.birthDate || 'Sin fecha')
        row.push(applicant.address || 'Sin dirección')
        row.push(applicant.commune || 'Sin comuna')
        row.push(applicant.region || 'Sin región')
        row.push(applicant.institutionName || 'Sin institución')
        row.push(applicant.institutionCommune || 'Sin comuna')
        row.push(applicant.createdAt ? new Date(applicant.createdAt).toLocaleDateString('es-CL') : 'Sin fecha')
        
        // Estado del formulario
        if (!app.formSubmitted) {
          row.push('No entregado')
        } else if (!app.answers || Object.keys(app.answers).length === 0) {
          row.push('Sin respuestas')
        } else {
          row.push('Entregado')
        }

        // RESPUESTAS DEL FORMULARIO
        const answers = app.answers || {}
        for (const field of formFields) {
          const answer = answers[field.name]
          
          // Si no hay respuesta
          if (answer === null || answer === undefined || answer === '') {
            row.push('Sin respuesta')
            continue
          }

          // Detectar si es un UUID (archivo)
          const isFile = typeof answer === 'string' && 
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(answer)
          
          if (isFile) {
            row.push('Entregado')
            continue
          }

          // Si es array (selección múltiple)
          if (Array.isArray(answer)) {
            row.push(answer.join(', '))
            continue
          }

          // Si es objeto
          if (typeof answer === 'object') {
            // Si tiene propiedad value
            if (answer.value !== undefined) {
              if (Array.isArray(answer.value)) {
                row.push(answer.value.join(', '))
              } else {
                row.push(String(answer.value))
              }
            } else {
              // Si es un objeto sin value, convertir a JSON
              row.push(JSON.stringify(answer))
            }
            continue
          }

          // Valor simple
          row.push(String(answer))
        }

        csvRows.push(row)
      }

      // 8. Convertir a formato CSV
      const csvContent = csvRows
        .map(row =>
          row
            .map(cell => {
              // Escapar comillas y envolver en comillas si contiene comas/saltos de línea
              const escaped = String(cell).replace(/"/g, '""')
              if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
                return `"${escaped}"`
              }
              return escaped
            })
            .join(',')
        )
        .join('\n')

      // 9. Descargar el archivo
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `respuestas-${selectedCall.name}-${selectedCall.year}-${selectedMilestone.name}.csv`
      link.click()
      URL.revokeObjectURL(link.href)

      showSuccess(`CSV descargado exitosamente con ${csvRows.length - 1} respuestas del hito "${selectedMilestone.name}"`)
    } catch (err: any) {
      showError(`Error al descargar CSV: ${err.message}`)
      console.error(err)
    }
  }

  // Función para descargar en formato Excel con primera fila destacada
  async function downloadExcel(selectedMilestone: any) {
    if (!selectedCall) return

    try {
      setFormatModalOpen(false)
      console.log('Descargando Excel del hito:', selectedMilestone.name)

      // Reutilizar la misma lógica de obtención de datos que CSV
      const formRes = await authFetch(
        `${API_BASE}/forms/${selectedMilestone.formId}`,
        { headers }
      )
      if (!formRes.ok) throw new Error('No se pudo obtener el formulario')
      const form = await formRes.json()

      const appsRes = await fetch(
        `${API_BASE}/applications?callId=${selectedCall.id}&limit=1000`,
        { headers }
      )
      if (!appsRes.ok) throw new Error('No se pudieron obtener las postulaciones')
      const appsData = await appsRes.json()
      const applications = Array.isArray(appsData) ? appsData : appsData.data || []

      const submissionsPromises = applications.map((app: any) =>
        authFetch(`${API_BASE}/form-submissions/application/${app.id}`, { headers })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
      const submissionsResults = await Promise.all(submissionsPromises)

      // Obtener datos de applicants directamente con query SQL personalizada
      const applicantIds = applications.map((app: any) => app.applicantId || app.applicant_id).filter(Boolean)
      const applicantPromises = applicantIds.map((applicantId: string) =>
        authFetch(`${API_BASE}/admin/applicants/${applicantId}`, { headers })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
      const applicantsData = await Promise.all(applicantPromises)
      
      // Crear un mapa de applicantId -> datos del applicant
      const applicantsMap = new Map()
      applicantsData.forEach((data, idx) => {
        if (data) {
          applicantsMap.set(applicantIds[idx], data)
        }
      })
      
      // Mapear applicants en el orden de las aplicaciones
      const applicants = applications.map((app: any) => 
        applicantsMap.get(app.applicantId || app.applicant_id) || null
      )

      const formFields: Array<{ name: string; label: string; type: string }> = []
      for (const section of form.sections || []) {
        for (const field of section.fields || []) {
          formFields.push({
            name: field.name,
            label: field.label,
            type: field.type
          })
        }
      }

      const applicationsWithData = applications.map((app: any, idx: number) => {
        const submissions = submissionsResults[idx]
        const applicant = applicants[idx]
        
        if (submissions && applicant) {
          let submission
          if (Array.isArray(submissions)) {
            submission = submissions.find((s: any) => 
              (s.milestone_id || s.milestoneId) === selectedMilestone.id
            )
          } else {
            submission = submissions
          }

          const answers = submission?.form_data || submission?.formData || submission?.answers || null
          const submitted = submission?.submitted_at || submission?.submittedAt || null

          if (answers && submitted) {
            return { ...app, applicant, answers, formSubmitted: true }
          }
        }
        
        return { 
          ...app, 
          applicant,
          answers: null,
          formSubmitted: false
        }
      })

      const excelRows: any[][] = []
      
      const userHeaders = [
        'Nombre Completo', 'Email', 'RUT', 'Teléfono',
        'Fecha de Nacimiento', 'Dirección', 'Comuna', 'Región',
        'Institución', 'Comuna Institución', 'Fecha de Registro',
        'Estado Formulario'
      ]
      
      const formHeaders = formFields.map(f => f.label)
      excelRows.push([...userHeaders, ...formHeaders])

      for (const app of applicationsWithData) {
        const row: any[] = []
        const applicant = app.applicant || {}
        
        row.push(
          applicant.fullName || `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim() || 'Sin nombre',
          applicant.email || 'Sin email',
          applicant.rutNumber && applicant.rutDv ? `${applicant.rutNumber}-${applicant.rutDv}` : 'Sin RUT',
          applicant.phone || 'Sin teléfono',
          applicant.birthDate ? new Date(applicant.birthDate).toLocaleDateString('es-CL') : 'Sin fecha',
          applicant.address || 'Sin dirección',
          applicant.commune || 'Sin comuna',
          applicant.region || 'Sin región',
          applicant.institutionName || 'Sin institución',
          applicant.institutionCommune || 'Sin comuna',
          applicant.createdAt ? new Date(applicant.createdAt).toLocaleDateString('es-CL') : 'Sin fecha',
          app.formSubmitted ? 'Entregado' : 'No entregado'
        )

        for (const field of formFields) {
          const answer = app.answers?.[field.name]

          if (answer === null || answer === undefined || answer === '') {
            row.push('Sin respuesta')
            continue
          }

          const isFile = typeof answer === 'string' && 
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(answer)
          
          if (isFile) {
            row.push('Entregado')
            continue
          }

          if (Array.isArray(answer)) {
            row.push(answer.join(', '))
            continue
          }

          if (typeof answer === 'object') {
            if (answer.value !== undefined) {
              if (Array.isArray(answer.value)) {
                row.push(answer.value.join(', '))
              } else {
                row.push(String(answer.value))
              }
            } else {
              row.push(JSON.stringify(answer))
            }
            continue
          }

          row.push(String(answer))
        }

        excelRows.push(row)
      }

      // Crear libro de Excel con ExcelJS
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(selectedMilestone.name.substring(0, 31))

      // Agregar filas
      worksheet.addRows(excelRows)

      // Aplicar estilo a la primera fila (cabecera)
      const headerRow = worksheet.getRow(1)
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFB19CD9' } // Morado claro
        }
        cell.font = {
          bold: true,
          size: 12,
          color: { argb: 'FFFFFFFF' } // Texto blanco para mejor contraste
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left'
        }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
      headerRow.height = 20

      // Ajustar ancho de columnas automáticamente
      worksheet.columns.forEach((column, index) => {
        let maxLength = 10
        const headerCell = excelRows[0][index]
        if (headerCell) {
          maxLength = Math.max(maxLength, String(headerCell).length)
        }
        column.width = Math.min(maxLength + 2, 50)
      })

      // Descargar el archivo
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `respuestas-${selectedCall.name}-${selectedCall.year}-${selectedMilestone.name}.xlsx`
      link.click()
      URL.revokeObjectURL(link.href)

      showSuccess(`Excel descargado exitosamente con ${excelRows.length - 1} respuestas del hito "${selectedMilestone.name}"`)
    } catch (err: any) {
      showError(`Error al descargar Excel: ${err.message}`)
      console.error(err)
    }
  }

  function formatRut(value: string): string {
    // Eliminar todo excepto números y K
    const clean = value.replace(/[^0-9kK]/g, '').toUpperCase()
    
    // Si está vacío, devolver vacío
    if (!clean) return ''
    
    // Separar cuerpo y dígito verificador
    const body = clean.slice(0, -1)
    const dv = clean.slice(-1)
    
    // Si solo hay un dígito, devolverlo sin formato
    if (body.length === 0) return dv
    
    // Formatear el cuerpo con puntos
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    
    // Devolver con guión
    return `${formatted}-${dv}`
  }

  function onChange<K extends keyof typeof createForm>(k: K, v: (typeof createForm)[K]) {
    // Si es el campo RUT, formatearlo automáticamente
    if (k === 'rut' && typeof v === 'string') {
      const formatted = formatRut(v)
      setCreateForm((s) => ({ ...s, [k]: formatted as any }))
    } else {
      setCreateForm((s) => ({ ...s, [k]: v }))
    }
  }

  async function createApplicant(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreateLoading(true)
    try {
      // ⚠️ VALIDACIÓN CRÍTICA: Debe haber convocatoria seleccionada
      if (!selectedCallId) {
        throw new Error('⚠️ Debes seleccionar una convocatoria antes de crear un postulante')
      }
      
      // Validar RUT (obligatorio)
      if (!createForm.rut?.trim()) {
        throw new Error('El RUT es obligatorio')
      }

      // Validar formato del RUT (debe tener guión)
      const rutTrimmed = createForm.rut.trim()
      if (!rutTrimmed.includes('-')) {
        throw new Error('El RUT debe tener el formato: 12345678-9')
      }

      // Construir fullName ya que el backend espera `fullName`
      const first = createForm.first_name?.trim() || ''
      const last = createForm.last_name?.trim() || ''
      let fullName = (first + (last ? ` ${last}` : '')).trim()
      if (!fullName) {
        // Derivar nombre del correo antes de la @ si no hay nombre
        const local = createForm.email.split('@')[0] || ''
        fullName = local.replace(/[._\-]/g, ' ').replace(/\b\w/g, (m: string) => m.toUpperCase())
      }

      const payload: any = {
        email: createForm.email.trim(),
        fullName,
        rut: rutTrimmed, // RUT es obligatorio
      }
      if (createForm.first_name?.trim()) payload.first_name = createForm.first_name.trim()
      if (createForm.last_name?.trim()) payload.last_name = createForm.last_name.trim()
      if (createForm.phone?.trim()) payload.phone = createForm.phone.trim()
      if (createForm.birth_date?.trim()) payload.birth_date = createForm.birth_date.trim()
      if (createForm.address?.trim()) payload.address = createForm.address.trim()
      if (createForm.commune?.trim()) payload.commune = createForm.commune.trim()
      if (createForm.region?.trim()) payload.region = createForm.region.trim()
      if (createForm.institution_id?.trim()) payload.institution_id = createForm.institution_id.trim()
      if (selectedCallId) payload.call_id = selectedCallId

      const res = await authFetch(`${API_BASE}/applicants`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await safeError(res))
      // recargar
      setCreating(false)
      setCreateForm({ email: '', first_name: '', last_name: '', rut: '', phone: '', birth_date: '', address: '', commune: '', region: '', institution_id: '' })
      setExtraFields([])
      // volver a primera página para ver el nuevo si el backend ordena por fecha desc
      setOffset(0)
      await load()
    } catch (err: any) {
      setCreateError(err.message ?? 'No se pudo crear el postulante')
    } finally {
      setCreateLoading(false)
    }
  }

  function fullName(r: ApplicantRow) {
    const a = (r.firstName ?? '').trim()
    const b = (r.lastName ?? '').trim()
    return (a + (b ? ` ${b}` : '')).trim()
  }

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto w-full max-w-[98%]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Postulantes</h1>
          <p className="text-slate-600">
            Ingreso manual, búsqueda y visualización de postulantes.
          </p>
        </header>

        {/* Barra de acciones */}
        <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <div className="flex gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o correo…"
              className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
            <button
              onClick={() => {
                setOffset(0)
                load()
              }}
              className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Buscar
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedCall && (
              <>
                <button
                  onClick={openMilestoneSelection}
                  className="rounded-md border border-green-600 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 flex items-center gap-2 flex-1 sm:flex-initial justify-center"
                  title="Descargar respuestas de formularios en CSV"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Descargar CSV</span>
                  <span className="sm:hidden">CSV</span>
                </button>

              </>
            )}
            <button
              onClick={() => setCreating(true)}
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 w-full sm:w-auto"
            >
              Ingresar postulante
            </button>
          </div>
        </div>

        {/* Vista de tabla / cards responsive */}
        {loading ? (
          <div className="card p-6">
            <p className="text-slate-600">Cargando…</p>
          </div>
        ) : error ? (
          <div className="card p-6">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="card p-6">
            <p className="text-center text-slate-500">No hay registros.</p>
          </div>
        ) : (
          <>
            {/* Vista Desktop - Tabla */}
            <div className="hidden lg:block card overflow-hidden">
              <div className="overflow-x-auto max-h-[calc(100vh-16rem)]">
                <table className="w-full text-sm">
                <thead className="text-left text-slate-600 bg-slate-100 sticky top-0 z-10">
                  <tr className="border-b">
                    <th className="py-3 px-3 font-semibold">Nombre</th>
                    <th className="py-3 px-3 font-semibold">RUT</th>
                    <th className="py-3 px-3 font-semibold">Correo</th>
                    <th className="py-3 px-3 font-semibold">Teléfono</th>
                    <th className="py-3 px-3 font-semibold">Escuela/Colegio</th>
                    <th className="py-3 px-3 font-semibold">Creado</th>
                    <th className="py-3 px-3 font-semibold">Invitación</th>
                    <th className="py-3 px-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                      const name = r.fullName || fullName(r) || '—'
                      const rut = r.rutNumber && r.rutDv 
                        ? `${r.rutNumber.toLocaleString('es-CL')}-${r.rutDv}` 
                        : '—'
                      const school = r.institutionName 
                        ? `${r.institutionName}${r.institutionCommune ? ` (${r.institutionCommune})` : ''}`
                        : '—'
                      const inviteStatus = inviteStatuses[r.id]
                      
                      return (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium !text-slate-900" title={name}>{name}</td>
                          <td className="py-2 px-3 font-mono text-xs !text-slate-700">{rut}</td>
                          <td className="py-2 px-3 !text-slate-700" title={r.email}>{r.email}</td>
                          <td className="py-2 px-3 !text-slate-700">{r.phone || '—'}</td>
                          <td className="py-2 px-3 !text-slate-700" title={school}>{school}</td>
                          <td className="py-2 px-3 !text-slate-700 whitespace-nowrap">
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleDateString('es-CL')
                              : '—'}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {inviteStatus ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="text-xs text-green-700">
                                  Invitado ({inviteStatus.method === 'auto' ? 'Email' : 'Manual'})
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => openInviteModal(r)}
                                className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700"
                              >
                                <Send className="w-3 h-3" />
                                Invitar
                              </button>
                            )}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => generateQuickCode(r)}
                                className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2 py-1 text-xs font-medium text-white hover:bg-purple-700"
                                title="Generar código"
                              >
                                <Key className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingApplicant(r)}
                                className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
                                title="Editar postulante"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedApplicantId(r.id)
                                  setDetailModalOpen(true)
                                }}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-600 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                                title="Ver detalles"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteApplicant(r)}
                                disabled={deletingApplicantId === r.id}
                                className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                title="Eliminar postulante"
                              >
                                {deletingApplicantId === r.id ? (
                                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
              </div>
            </div>

            {/* Vista Mobile - Cards */}
            <div className="lg:hidden space-y-3">
              {rows.map((r) => {
                const name = r.fullName || fullName(r) || '—'
                const rut = r.rutNumber && r.rutDv 
                  ? `${r.rutNumber.toLocaleString('es-CL')}-${r.rutDv}` 
                  : '—'
                const school = r.institutionName 
                  ? `${r.institutionName}${r.institutionCommune ? ` (${r.institutionCommune})` : ''}`
                  : '—'
                const inviteStatus = inviteStatuses[r.id]
                
                return (
                  <div key={r.id} className="card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold !text-slate-900 truncate">{name}</h3>
                        <p className="text-xs font-mono !text-slate-600 mt-1">{rut}</p>
                      </div>
                      {inviteStatus && (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="!text-slate-600 w-20 flex-shrink-0">Correo:</span>
                        <span className="!text-slate-900 break-all">{r.email}</span>
                      </div>
                      {r.phone && (
                        <div className="flex gap-2">
                          <span className="!text-slate-600 w-20 flex-shrink-0">Teléfono:</span>
                          <span className="!text-slate-900">{r.phone}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <span className="!text-slate-600 w-20 flex-shrink-0">Escuela:</span>
                        <span className="!text-slate-900 flex-1">{school}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="!text-slate-600 w-20 flex-shrink-0">Creado:</span>
                        <span className="!text-slate-900">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-CL') : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {!inviteStatus ? (
                        <button
                          onClick={() => openInviteModal(r)}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
                        >
                          <Send className="w-4 h-4" />
                          Invitar
                        </button>
                      ) : (
                        <div className="flex-1 flex items-center justify-center gap-2 text-sm text-green-700">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Invitado ({inviteStatus.method === 'auto' ? 'Email' : 'Manual'})</span>
                        </div>
                      )}
                      <button
                        onClick={() => generateQuickCode(r)}
                        className="inline-flex items-center justify-center gap-1 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
                      >
                        <Key className="w-4 h-4" />
                        Código
                      </button>
                      <button
                        onClick={() => setEditingApplicant(r)}
                        className="inline-flex items-center justify-center gap-1 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setSelectedApplicantId(r.id)
                          setDetailModalOpen(true)
                        }}
                        className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                      <button
                        onClick={() => deleteApplicant(r)}
                        disabled={deletingApplicantId === r.id}
                        className="inline-flex items-center justify-center gap-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingApplicantId === r.id ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Paginación */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Filas por página:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setOffset(0)
              }}
              className="rounded-md border px-2 py-1"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="rounded-md border px-3 py-1.5 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={meta ? offset + limit >= meta.total : undefined}
              className="rounded-md border px-3 py-1.5 disabled:opacity-50"
            >
              Siguiente
            </button>
            <span className="text-slate-600">
              {meta
                ? `${Math.min(meta.total, offset + 1)}–${Math.min(
                    meta.total,
                    offset + rows.length,
                  )} de ${meta.total}`
                : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Modal crear */}
      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white shadow-lg">
            <div className="border-b px-5 py-3">
              <div className="text-base font-semibold">Ingresar postulante</div>
            </div>
            <form onSubmit={createApplicant} className="px-5 py-4 space-y-4">
              {createError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {createError}
                </div>
              )}
              
              {!selectedCallId && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Sin convocatoria seleccionada
                  </div>
                  <p>Debes seleccionar una convocatoria en el selector de arriba antes de crear un postulante.</p>
                </div>
              )}

              {/* Campos siempre visibles (básicos) */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">Correo electrónico *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => onChange('email', e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    placeholder="alumno@colegio.cl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={createForm.first_name}
                    onChange={(e) => onChange('first_name', e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    placeholder="Ej: María José"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={createForm.last_name}
                    onChange={(e) => onChange('last_name', e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    placeholder="Ej: Pérez Soto"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">RUT * <span className="text-xs text-gray-500 font-normal">(solo números, se formatea automáticamente)</span></label>
                  <input
                    type="text"
                    required
                    value={createForm.rut}
                    onChange={(e) => onChange('rut', e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    placeholder="123456789 (se formatea automáticamente a 12.345.678-9)"
                  />
                </div>

                <div className="md:col-span-2">
                  <InstitutionSearchSelector
                    value={createForm.institution_id}
                    onChange={(id) => onChange('institution_id', id)}
                    required
                  />
                </div>
              </div>

              {/* Selector de campos opcionales */}
              <div className="border-t pt-3">
                <div className="mb-2 flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Agregar campo opcional:</label>
                  <select
                    value=""
                    onChange={(e) => {
                      const v = e.target.value
                      if (!v) return
                      if (!extraFields.includes(v)) setExtraFields((s) => [...s, v])
                      e.currentTarget.value = ''
                    }}
                    className="rounded-md border px-2 py-1 text-sm"
                  >
                    <option value="">Seleccione…</option>
                    <option value="phone" disabled={extraFields.includes('phone')}>Teléfono</option>
                    <option value="birth_date" disabled={extraFields.includes('birth_date')}>Fecha de nacimiento</option>
                    <option value="address" disabled={extraFields.includes('address')}>Dirección</option>
                    <option value="commune" disabled={extraFields.includes('commune')}>Comuna</option>
                    <option value="region" disabled={extraFields.includes('region')}>Región</option>
                  </select>
                </div>

                {/* Campos opcionales agregados */}
                {extraFields.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {extraFields.includes('phone') && (
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium">Teléfono</label>
                        <input
                          type="tel"
                          value={createForm.phone}
                          onChange={(e) => onChange('phone', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          placeholder="+56 9 1234 5678"
                        />
                      </div>
                    )}
                    {extraFields.includes('birth_date') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Fecha de nacimiento</label>
                        <input
                          type="date"
                          value={createForm.birth_date}
                          onChange={(e) => onChange('birth_date', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                        />
                      </div>
                    )}
                    {extraFields.includes('address') && (
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium">Dirección</label>
                        <input
                          type="text"
                          value={createForm.address}
                          onChange={(e) => onChange('address', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          placeholder="Calle, número, depto"
                        />
                      </div>
                    )}
                    {extraFields.includes('commune') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Comuna</label>
                        <input
                          type="text"
                          value={createForm.commune}
                          onChange={(e) => onChange('commune', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          placeholder="Ej: Santiago"
                        />
                      </div>
                    )}
                    {extraFields.includes('region') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Región</label>
                        <input
                          type="text"
                          value={createForm.region}
                          onChange={(e) => onChange('region', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          placeholder="Ej: Metropolitana"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false)
                    setExtraFields([])
                  }}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !selectedCallId}
                  className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {createLoading ? 'Creando…' : !selectedCallId ? 'Selecciona convocatoria' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de detalles del postulante */}
      {detailModalOpen && selectedApplicantId && (
        <ApplicantDetailModal
          applicantId={selectedApplicantId}
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false)
            setSelectedApplicantId(null)
          }}
        />
      )}

      {/* Modal de invitación */}
      {inviteModalOpen && selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">
                Invitar a {selectedApplicant.firstName || selectedApplicant.fullName || 'Postulante'}
              </h2>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {!selectedCall ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-900">
                    Selecciona una convocatoria en el menú lateral para continuar.
                  </p>
                </div>
              ) : !inviteSuccess && !generatedCode ? (
                <>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm"><strong>Email:</strong> {selectedApplicant.email}</p>
                    <p className="text-sm"><strong>Convocatoria:</strong> {selectedCall.name}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-3">¿Cómo deseas enviar la invitación?</p>
                    
                    <div className="space-y-3">
                      <button
                        onClick={sendAutoInvite}
                        disabled={inviteLoading}
                        className="w-full flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        <Mail className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Enviar automáticamente por email</div>
                          <p className="text-sm text-slate-600 mt-1">
                            El sistema enviará un correo electrónico con el código de invitación
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={generateManualInvite}
                        disabled={inviteLoading}
                        className="w-full flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        <Copy className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Obtener cuerpo del mensaje (envío manual)</div>
                          <p className="text-sm text-slate-600 mt-1">
                            Se generará el código y verás el asunto y cuerpo del email para copiar
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {inviteError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-900">Error</p>
                      <p className="text-sm text-red-700">{inviteError}</p>
                    </div>
                  )}

                  {inviteLoading && (
                    <div className="text-center py-4">
                      <p className="text-sm text-slate-600">Procesando...</p>
                    </div>
                  )}
                </>
              ) : inviteSuccess && !generatedCode ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">¡Mensaje enviado!</p>
                      <p className="text-sm text-green-700 mt-1">
                        El correo con el código de invitación ha sido enviado a{' '}
                        <strong>{selectedApplicant.email}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              ) : generatedCode ? (
                <div className="space-y-4">
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-sky-600" />
                        <p className="font-medium text-sky-900">Código generado</p>
                      </div>
                      <button
                        onClick={regenerateInviteCode}
                        disabled={inviteLoading}
                        className="text-xs px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1"
                        title="Regenerar código si el postulante tiene problemas"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerar
                      </button>
                    </div>
                    <p className="text-sm text-sky-700">
                      Copia el siguiente contenido y envíalo manualmente por WhatsApp, SMS o el medio que prefieras.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Asunto */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Asunto del correo</label>
                        <button
                          onClick={() => copyToClipboard(emailSubject)}
                          className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </button>
                      </div>
                      <div className="bg-slate-50 border rounded-lg p-3">
                        <p className="text-sm">{emailSubject}</p>
                      </div>
                    </div>

                    {/* Destinatario */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Correo del destinatario</label>
                        <button
                          onClick={() => copyToClipboard(selectedApplicant.email)}
                          className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </button>
                      </div>
                      <div className="bg-slate-50 border rounded-lg p-3">
                        <p className="text-sm font-mono">{selectedApplicant.email}</p>
                      </div>
                    </div>

                    {/* Cuerpo del mensaje */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Cuerpo del mensaje</label>
                        <button
                          onClick={() => copyToClipboard(emailBody)}
                          className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </button>
                      </div>
                      <div className="bg-slate-50 border rounded-lg p-3 max-h-64 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap font-sans">{emailBody}</pre>
                      </div>
                    </div>

                    {/* Botón para copiar todo */}
                    <button
                      onClick={() => copyToClipboard(`${emailSubject}\n\n${emailBody}`)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar todo (asunto + cuerpo)
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end">
              <button
                onClick={() => setInviteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de código rápido */}
      {quickCodeModalOpen && quickCodeApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">
                Código de Invitación
              </h2>
              <button
                onClick={() => setQuickCodeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {quickCodeLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-sm text-slate-600">Generando código...</p>
                </div>
              ) : quickCodeError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700">{quickCodeError}</p>
                </div>
              ) : quickGeneratedCode ? (
                <>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm">
                      <strong>Postulante:</strong> {quickCodeApplicant.firstName && quickCodeApplicant.lastName 
                        ? `${quickCodeApplicant.firstName} ${quickCodeApplicant.lastName}`
                        : quickCodeApplicant.fullName || quickCodeApplicant.email}
                    </p>
                    <p className="text-sm">
                      <strong>Email:</strong> {quickCodeApplicant.email}
                    </p>
                    {selectedCall && (
                      <p className="text-sm">
                        <strong>Convocatoria:</strong> {selectedCall.name}
                      </p>
                    )}
                  </div>

                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-purple-900 mb-2">
                      CÓDIGO DE INVITACIÓN
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-2xl font-mono font-bold text-purple-600 bg-white px-4 py-3 rounded border text-center tracking-wider">
                        {quickGeneratedCode}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(quickGeneratedCode)
                          showSuccess('Código copiado al portapapeles')
                        }}
                        className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        title="Copiar código"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-blue-900 mb-2">
                      📋 INSTRUCCIONES PARA EL POSTULANTE
                    </p>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Ingresar al portal de postulaciones</li>
                      <li>Usar el código: <code className="bg-white px-2 py-0.5 rounded font-mono">{quickGeneratedCode}</code></li>
                      <li>Introducir su email: <code className="bg-white px-2 py-0.5 rounded font-mono">{quickCodeApplicant.email}</code></li>
                      <li>Crear una contraseña</li>
                      <li>Completar el formulario</li>
                    </ol>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">
                      Código generado exitosamente. Envíalo al postulante por tu medio preferido.
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end">
              <button
                onClick={() => setQuickCodeModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de envío masivo */}
      {bulkInviteOpen && selectedCall && (
        <BulkInviteModal
          callId={selectedCall.id}
          callName={selectedCall.name}
          onClose={() => setBulkInviteOpen(false)}
          onSuccess={() => {
            load()
          }}
        />
      )}

      {/* Modal de edición */}
      {editingApplicant && (
        <EditApplicantModal
          applicant={editingApplicant}
          onClose={() => setEditingApplicant(null)}
          onSuccess={() => {
            load()
          }}
        />
      )}

      {/* Modal de selección de formato (Excel/CSV) */}
      {formatModalOpen && selectedMilestoneForDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Seleccionar Formato</h2>
              <button
                onClick={() => setFormatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              <p className="text-sm text-slate-600 mb-4">
                ¿En qué formato deseas descargar las respuestas del hito <strong>{selectedMilestoneForDownload.name}</strong>?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => downloadExcel(selectedMilestoneForDownload)}
                  className="w-full text-left px-4 py-4 border-2 rounded-lg hover:bg-green-50 hover:border-green-500 transition-colors flex items-center gap-4 group"
                >
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 group-hover:text-green-700">
                      Excel (.xlsx)
                    </div>
                    <div className="text-sm text-slate-500">
                      Primera fila con fondo gris y negrita
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => downloadCSV(selectedMilestoneForDownload)}
                  className="w-full text-left px-4 py-4 border-2 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors flex items-center gap-4 group"
                >
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 group-hover:text-blue-700">
                      CSV (.csv)
                    </div>
                    <div className="text-sm text-slate-500">
                      Compatible con todas las hojas de cálculo
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end">
              <button
                onClick={() => setFormatModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de hito para CSV */}
      {milestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Seleccionar Hito</h2>
              <button
                onClick={() => setMilestoneModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              <p className="text-sm text-slate-600 mb-4">
                Selecciona el hito del cual deseas descargar las respuestas:
              </p>
              <div className="space-y-2">
                {availableMilestones.map((milestone) => (
                  <button
                    key={milestone.id}
                    onClick={() => showFormatModal(milestone)}
                    className="w-full text-left px-4 py-3 border rounded-lg hover:bg-slate-50 hover:border-sky-500 transition-colors flex items-center justify-between group"
                  >
                    <span className="font-medium text-slate-700 group-hover:text-sky-600">
                      {milestone.name}
                    </span>
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-sky-600" />
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end">
              <button
                onClick={() => setMilestoneModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

async function safeError(res: Response) {
  try {
    const data = await res.json()
    return data?.message || data?.error || res.statusText
  } catch {
    return res.statusText
  }
}
