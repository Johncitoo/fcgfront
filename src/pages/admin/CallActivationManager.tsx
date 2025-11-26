import { useState, useEffect } from "react";
import { callsService } from "@/services/calls.service";
import { toast } from "sonner";

interface Call {
  id: string;
  name: string;
  year: number;
  status: "DRAFT" | "OPEN" | "CLOSED";
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  autoClose: boolean;
  totalSeats: number;
  isCurrentlyActive?: boolean;
}

export default function CallActivationManager() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalls();
  }, []);

  const loadCalls = async () => {
    try {
      const response = await callsService.getCalls({
        limit: 100,
        offset: 0,
        onlyActive: false,
      });
      setCalls(response.data || []);
    } catch (error) {
      console.error("Error loading calls:", error);
      toast.error("Error al cargar convocatorias");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (callId: string, currentValue: boolean) => {
    try {
      await callsService.updateCall(callId, {
        isActive: !currentValue,
      });
      toast.success(
        !currentValue
          ? "Convocatoria activada"
          : "Convocatoria desactivada"
      );
      loadCalls();
    } catch (error) {
      console.error("Error toggling activation:", error);
      toast.error("Error al cambiar estado de activación");
    }
  };

  const handleUpdateDates = async (
    callId: string,
    startDate: string | null,
    endDate: string | null
  ) => {
    try {
      await callsService.updateCall(callId, {
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
      });
      toast.success("Fechas actualizadas");
      loadCalls();
    } catch (error) {
      console.error("Error updating dates:", error);
      toast.error("Error al actualizar fechas");
    }
  };

  const handleToggleAutoClose = async (callId: string, currentValue: boolean) => {
    try {
      await callsService.updateCall(callId, {
        autoClose: !currentValue,
      });
      toast.success(
        !currentValue
          ? "Cierre automático activado"
          : "Cierre automático desactivado"
      );
      loadCalls();
    } catch (error) {
      console.error("Error toggling auto-close:", error);
      toast.error("Error al cambiar cierre automático");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Sin definir";
    return new Date(dateString).toLocaleString("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getStatusColor = (call: Call) => {
    if (call.status !== "OPEN" || !call.isActive) {
      return "bg-gray-100 text-gray-600";
    }

    const now = new Date();
    if (call.startDate && new Date(call.startDate) > now) {
      return "bg-yellow-100 text-yellow-700";
    }
    if (call.autoClose && call.endDate && new Date(call.endDate) < now) {
      return "bg-red-100 text-red-700";
    }

    return "bg-green-100 text-green-700";
  };

  const getStatusText = (call: Call) => {
    if (call.status !== "OPEN") {
      return call.status === "DRAFT" ? "Borrador" : "Cerrada";
    }
    if (!call.isActive) {
      return "Inactiva";
    }

    const now = new Date();
    if (call.startDate && new Date(call.startDate) > now) {
      return "Programada";
    }
    if (call.autoClose && call.endDate && new Date(call.endDate) < now) {
      return "Vencida";
    }

    return "Activa";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Control de Activación de Convocatorias
        </h1>
        <p className="text-gray-600 mt-2">
          Gestiona qué convocatorias están disponibles para que los postulantes puedan aplicar
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Convocatoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha Inicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha Cierre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cierre Auto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Activación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calls.map((call) => (
                <CallRow
                  key={call.id}
                  call={call}
                  onToggleActive={handleToggleActive}
                  onUpdateDates={handleUpdateDates}
                  onToggleAutoClose={handleToggleAutoClose}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Cómo funciona:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>
            <strong>Activación Manual:</strong> Toggle para activar/desactivar convocatoria
          </li>
          <li>
            <strong>Fecha Inicio:</strong> Postulantes no pueden aplicar antes de esta fecha
          </li>
          <li>
            <strong>Fecha Cierre:</strong> Con cierre automático, se cierra al llegar a esta fecha
          </li>
          <li>
            <strong>Cierre Automático:</strong> Si está desactivado, la convocatoria permanece abierta después de la fecha de cierre
          </li>
          <li>
            <strong>Estado OPEN + Activa + Fechas válidas:</strong> Convocatoria disponible para postulantes
          </li>
        </ul>
      </div>
    </div>
  );
}

interface CallRowProps {
  call: Call;
  onToggleActive: (callId: string, currentValue: boolean) => void;
  onUpdateDates: (
    callId: string,
    startDate: string | null,
    endDate: string | null
  ) => void;
  onToggleAutoClose: (callId: string, currentValue: boolean) => void;
  formatDate: (dateString: string | null) => string;
  getStatusColor: (call: Call) => string;
  getStatusText: (call: Call) => string;
}

function CallRow({
  call,
  onToggleActive,
  onUpdateDates,
  onToggleAutoClose,
  formatDate,
  getStatusColor,
  getStatusText,
}: CallRowProps) {
  const [editing, setEditing] = useState(false);
  const [startDate, setStartDate] = useState(
    call.startDate ? new Date(call.startDate).toISOString().slice(0, 16) : ""
  );
  const [endDate, setEndDate] = useState(
    call.endDate ? new Date(call.endDate).toISOString().slice(0, 16) : ""
  );

  const handleSaveDates = () => {
    onUpdateDates(
      call.id,
      startDate || null,
      endDate || null
    );
    setEditing(false);
  };

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{call.name}</div>
          <div className="text-sm text-gray-500">{call.year}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(call)}`}
        >
          {getStatusText(call)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {editing ? (
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        ) : (
          formatDate(call.startDate)
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {editing ? (
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        ) : (
          formatDate(call.endDate)
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={() => onToggleAutoClose(call.id, call.autoClose)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            call.autoClose ? "bg-blue-600" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              call.autoClose ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={() => onToggleActive(call.id, call.isActive)}
          disabled={call.status !== "OPEN"}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            call.isActive && call.status === "OPEN"
              ? "bg-green-600"
              : "bg-gray-200"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              call.isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSaveDates}
              className="text-green-600 hover:text-green-800 font-medium"
            >
              Guardar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Editar fechas
          </button>
        )}
      </td>
    </tr>
  );
}
