import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { GripVertical, Lock, Unlock, X } from 'lucide-react'
import { useCallContext } from '../../contexts/CallContext'

interface Milestone {
  id: string
  name: string
  description?: string
  orderIndex: number
  required: boolean
  whoCanFill: string[]
  status: 'ACTIVE' | 'PENDING'
  formId?: string
  dueDate?: string
  createdAt: string
  updatedAt: string
}

export default function MilestonesManagementPage() {
  const { selectedCallId, selectedCall: callFromContext } = useCallContext()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    description: string
    required: boolean
    whoCanFill: 'APPLICANT' | 'REVIEWER'
    status: 'ACTIVE' | 'PENDING'
    dueDate: string
  }>({
    name: '',
    description: '',
    required: true,
    whoCanFill: 'APPLICANT',
    status: 'PENDING',
    dueDate: '',
  })

  // Drag & drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isReorderLocked, setIsReorderLocked] = useState(true)

  useEffect(() => {
    if (selectedCallId) {
      loadMilestones()
    }
  }, [selectedCallId])

  const loadMilestones = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('[MilestonesManagement] Cargando hitos para call:', selectedCallId)
      const data = await apiGet<Milestone[]>(`/milestones/call/${selectedCallId}`)
      console.log('[MilestonesManagement] Hitos recibidos:', data.length)
      const sorted = data.sort((a: Milestone, b: Milestone) => a.orderIndex - b.orderIndex)
      setMilestones(sorted)
      console.log('[MilestonesManagement] Hitos ordenados y guardados en estado')
    } catch (err: any) {
      console.error('[MilestonesManagement] Error al cargar hitos:', err)
      setError(err.response?.data?.message || 'Error al cargar hitos')
    } finally {
      setLoading(false)
    }
  }



  const handleOpenModal = (milestone?: Milestone) => {
    if (milestone) {
      setEditingMilestone(milestone)
      setFormData({
        name: milestone.name,
        description: milestone.description || '',
        required: milestone.required,
        whoCanFill: (Array.isArray(milestone.whoCanFill) ? milestone.whoCanFill[0] : 'APPLICANT') as 'APPLICANT' | 'REVIEWER',
        status: milestone.status,
        dueDate: milestone.dueDate ? milestone.dueDate.split('T')[0] : '',
      })
    } else {
      setEditingMilestone(null)
      setFormData({
        name: '',
        description: '',
        required: true,
        whoCanFill: 'APPLICANT',
        status: 'PENDING',
        dueDate: '',
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingMilestone(null)
    setError(null)
    setSuccess(null)
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)

      // ⚠️ VALIDACIÓN CRÍTICA: Debe haber convocatoria seleccionada
      if (!selectedCallId) {
        throw new Error('⚠️ Debes seleccionar una convocatoria antes de crear o editar un hito')
      }

      // Construir payload sin incluir id
      const payload = {
        name: formData.name,
        description: formData.description,
        required: formData.required,
        whoCanFill: [formData.whoCanFill], // Convertir a array
        status: formData.status,
        callId: selectedCallId,
        orderIndex: editingMilestone ? editingMilestone.orderIndex : milestones.length + 1,
        ...(formData.dueDate ? { dueDate: formData.dueDate } : {}), // Solo incluir si tiene valor
      }

      if (editingMilestone) {
        console.log('[MilestonesManagement] Actualizando hito:', editingMilestone.id)
        await apiPatch(`/milestones/${editingMilestone.id}`, payload)
        setSuccess('Hito actualizado correctamente')
      } else {
        console.log('[MilestonesManagement] Creando hito nuevo:', payload)
        const newMilestone = await apiPost('/milestones', payload)
        console.log('[MilestonesManagement] Hito creado:', newMilestone)
        setSuccess('Hito creado correctamente')
      }

      console.log('[MilestonesManagement] Recargando lista de hitos...')
      await loadMilestones()
      console.log('[MilestonesManagement] Lista recargada, total hitos:', milestones.length)
      
      handleCloseModal()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar hito')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (milestoneId: string) => {
    if (!confirm('¿Estás seguro de eliminar este hito? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      await apiDelete(`/milestones/${milestoneId}`)
      setSuccess('Hito eliminado correctamente')
      await loadMilestones()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar hito')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (milestone: Milestone) => {
    const newStatus = milestone.status === 'ACTIVE' ? 'PENDING' : 'ACTIVE'

    // Si se va a activar, verificar que no haya otro activo
    if (newStatus === 'ACTIVE') {
      const activeCount = milestones.filter(m => m.status === 'ACTIVE' && m.id !== milestone.id).length
      if (activeCount > 0) {
        if (!confirm('Ya hay otro hito activo. ¿Deseas desactivar todos los demás y activar solo este?')) {
          return
        }
        // Desactivar todos primero
        for (const m of milestones.filter(m => m.status === 'ACTIVE')) {
          await apiPatch(`/milestones/${m.id}`, { status: 'PENDING' })
        }
      }
    }

    try {
      setLoading(true)
      setError(null)
      await apiPatch(`/milestones/${milestone.id}`, { status: newStatus })
      setSuccess(`Hito ${newStatus === 'ACTIVE' ? 'activado' : 'desactivado'} correctamente`)
      await loadMilestones()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cambiar estado del hito')
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (index: number) => {
    if (!isReorderLocked) {
      setDraggedIndex(index)
    }
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || isReorderLocked) return

    const draggedItem = milestones[draggedIndex]
    const newMilestones = [...milestones]
    newMilestones.splice(draggedIndex, 1)
    newMilestones.splice(index, 0, draggedItem)

    setMilestones(newMilestones)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null || isReorderLocked) return

    try {
      // Actualizar orderIndex en el backend
      for (let i = 0; i < milestones.length; i++) {
        await apiPatch(`/milestones/${milestones[i].id}`, { orderIndex: i + 1 })
      }
      setSuccess('Orden actualizado correctamente')
      await loadMilestones()
    } catch (err: any) {
      setError('Error al actualizar el orden')
      await loadMilestones()
    } finally {
      setDraggedIndex(null)
    }
  }

  const selectedCall = callFromContext

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestión de Hitos (Fases)</h1>
        <p className="text-gray-600">
          Administra las fases del proceso de postulación. Solo puede haber una fase activa a la vez.
        </p>
        {selectedCall && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-lg text-sm">
            <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium text-sky-900">
              Convocatoria: {selectedCall.name} ({selectedCall.year})
            </span>
            <span className="text-sky-700">— Estado: {selectedCall.status}</span>
          </div>
        )}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="alert alert-error mb-4">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* Lista de hitos */}
      {selectedCallId && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Hitos configurados</h2>
                {!isReorderLocked && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium animate-pulse">
                    Arrastra para reordenar
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsReorderLocked(!isReorderLocked)}
                  className={`btn ${isReorderLocked ? 'btn-outline' : 'bg-amber-500 text-white hover:bg-amber-600'} flex items-center gap-2 transition-all duration-200`}
                  title={isReorderLocked ? 'Desbloquear para reordenar arrastrando' : 'Bloquear orden'}
                >
                  {isReorderLocked ? (
                    <>
                      <Lock className="w-4 h-4" />
                      Orden Bloqueado
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      Reordenar Activo
                    </>
                  )}
                </button>
                <button onClick={() => handleOpenModal()} className="btn btn-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear Hito
                </button>
              </div>
            </div>
          </div>

          <div className="card-body">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="spinner text-sky-600"></div>
                <span className="ml-3 text-gray-600">Cargando...</span>
              </div>
            )}

            {!loading && milestones.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>No hay hitos configurados para esta convocatoria</p>
                <button onClick={() => handleOpenModal()} className="btn btn-primary mt-3">
                  Crear primer hito
                </button>
              </div>
            )}

            {!loading && Array.isArray(milestones) && milestones.length > 0 && (
              <div className="space-y-3">
                {milestones.map((milestone, index) => (
                  <div
                    key={milestone.id}
                    draggable={!isReorderLocked}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`border-2 rounded-lg p-4 transition-all ${
                      !isReorderLocked ? 'cursor-move hover:shadow-lg' : ''
                    } ${
                      milestone.status === 'ACTIVE'
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Drag Handle */}
                      {!isReorderLocked && (
                        <div className="flex items-center pt-1">
                          <GripVertical className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        </div>
                      )}
                      {/* Número de orden */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all duration-200 ${
                        milestone.status === 'ACTIVE' 
                          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg' 
                          : 'bg-gradient-to-br from-gray-300 to-gray-500'
                      }`}>
                        {milestone.orderIndex}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{milestone.name}</h3>
                            {milestone.description && (
                              <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                            )}
                          </div>
                          
                          {/* Badges */}
                          <div className="flex flex-wrap gap-2">
                            <span className={`badge ${milestone.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                              {milestone.status === 'ACTIVE' ? '● Activo' : '○ Pendiente'}
                            </span>
                            <span className={`badge ${milestone.whoCanFill?.[0] === 'APPLICANT' ? 'badge-info' : 'badge-purple'}`}>
                              {milestone.whoCanFill?.[0] === 'APPLICANT' ? 'Postulante' : 'Revisor'}
                            </span>
                            {milestone.required && (
                              <span className="badge badge-warn">Obligatorio</span>
                            )}
                          </div>
                        </div>

                        {/* Info adicional */}
                        {milestone.dueDate && (
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>Vence: {new Date(milestone.dueDate).toLocaleDateString('es-CL')}</span>
                            </div>
                          </div>
                        )}

                        {/* Acciones */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleToggleStatus(milestone)}
                            disabled={loading}
                            className={`btn btn-sm ${milestone.status === 'ACTIVE' ? 'btn-outline' : 'btn-success'}`}
                          >
                            {milestone.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => handleOpenModal(milestone)}
                            disabled={loading}
                            className="btn btn-sm btn-outline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(milestone.id)}
                            disabled={loading}
                            className="btn btn-sm border-rose-300 text-rose-700 hover:bg-rose-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para crear/editar */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal()
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideUp">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl font-bold text-gray-800">
                {editingMilestone ? 'Editar Hito' : 'Crear Nuevo Hito'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-700 hover:bg-white/50 rounded-full p-1 transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {!selectedCallId && (
                <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-800 rounded">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Sin convocatoria seleccionada
                  </div>
                  <p className="text-sm">Debes seleccionar una convocatoria en el selector de arriba antes de crear un hito.</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del hito *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Ej: Postulación Inicial"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input min-h-[80px]"
                    placeholder="Descripción opcional del hito"
                  />
                </div>

                {/* Quién completa */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ¿Quién completa este hito? *
                  </label>
                  <select
                    value={formData.whoCanFill}
                    onChange={(e) => setFormData({ ...formData, whoCanFill: e.target.value as any })}
                    className="input"
                  >
                    <option value="APPLICANT">Postulante</option>
                    <option value="REVIEWER">Revisor/Admin</option>
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado inicial
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="input"
                  >
                    <option value="PENDING">Pendiente (cerrado)</option>
                    <option value="ACTIVE">Activo (abierto)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Solo puede haber un hito activo a la vez
                  </p>
                </div>

                {/* Fecha límite */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha límite (opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="input"
                  />
                </div>

                {/* Obligatorio */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="required"
                    checked={formData.required}
                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                    className="w-4 h-4 text-sky-600 rounded"
                  />
                  <label htmlFor="required" className="text-sm text-gray-700">
                    Este hito es obligatorio
                  </label>
                </div>
              </div>

            </div>

            {/* Footer con botones */}
            <div className="border-t p-6 bg-gray-50/50 flex gap-3">
              <button
                onClick={handleSave}
                disabled={loading || !formData.name.trim() || !selectedCallId}
                className="btn btn-primary flex-1 transition-all duration-200 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : !selectedCallId ? 'Selecciona convocatoria' : editingMilestone ? 'Actualizar Hito' : 'Crear Hito'}
              </button>
              <button
                onClick={handleCloseModal}
                disabled={loading}
                className="btn btn-outline flex-1 transition-all duration-200 hover:bg-gray-100"
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
