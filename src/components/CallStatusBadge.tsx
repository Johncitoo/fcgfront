import { useCallContext } from "@/contexts/CallContext";
import { AlertCircle, Calendar, Clock } from "lucide-react";

interface CallStatusBadgeProps {
  showDetails?: boolean;
}

export function CallStatusBadge({ showDetails = false }: CallStatusBadgeProps) {
  const { selectedCall } = useCallContext();

  if (!selectedCall) return null;

  const call = selectedCall as any; // Tiene campos extras si viene de la API actualizada

  // Si no tiene campos de activación, no mostramos nada
  if (call.isActive === undefined) {
    return null;
  }

  const now = new Date();
  const startDate = call.startDate ? new Date(call.startDate) : null;
  const endDate = call.endDate ? new Date(call.endDate) : null;

  // Determinar estado
  let status: "active" | "scheduled" | "expired" | "inactive" | "closed";
  let message: string;
  let detail: string | null = null;

  if (call.status !== "OPEN") {
    status = "closed";
    message = call.status === "DRAFT" ? "En borrador" : "Cerrada";
  } else if (!call.isActive) {
    status = "inactive";
    message = "Inactiva";
    detail = "Esta convocatoria está desactivada por un administrador";
  } else if (startDate && now < startDate) {
    status = "scheduled";
    message = "Programada";
    const days = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    detail = `Abre en ${days} día${days !== 1 ? "s" : ""}`;
  } else if (call.autoClose && endDate && now > endDate) {
    status = "expired";
    message = "Vencida";
    const days = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    detail = `Cerró hace ${days} día${days !== 1 ? "s" : ""}`;
  } else {
    status = "active";
    message = "Activa";
    if (endDate) {
      const days = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      detail = `Cierra en ${days} día${days !== 1 ? "s" : ""}`;
    }
  }

  const colors = {
    active: "bg-green-100 text-green-800 border-green-200",
    scheduled: "bg-yellow-100 text-yellow-800 border-yellow-200",
    expired: "bg-red-100 text-red-800 border-red-200",
    inactive: "bg-gray-100 text-gray-800 border-gray-200",
    closed: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const icons = {
    active: <Clock className="w-4 h-4" />,
    scheduled: <Calendar className="w-4 h-4" />,
    expired: <AlertCircle className="w-4 h-4" />,
    inactive: <AlertCircle className="w-4 h-4" />,
    closed: <AlertCircle className="w-4 h-4" />,
  };

  if (!showDetails) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${colors[status]}`}
      >
        {icons[status]}
        {message}
      </span>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${colors[status]}`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[status]}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{message}</div>
        {detail && <div className="text-sm mt-0.5">{detail}</div>}
        {status === "inactive" && (
          <div className="text-xs mt-2 opacity-80">
            Los postulantes no pueden aplicar a esta convocatoria hasta que sea activada
          </div>
        )}
        {status === "scheduled" && (
          <div className="text-xs mt-2 opacity-80">
            Los postulantes podrán aplicar a partir del{" "}
            {startDate?.toLocaleDateString("es-CL", {
              dateStyle: "medium",
            })}
          </div>
        )}
        {status === "expired" && (
          <div className="text-xs mt-2 opacity-80">
            Los postulantes ya no pueden aplicar. Solo modo lectura
          </div>
        )}
      </div>
    </div>
  );
}

export function useCallStatus() {
  const { selectedCall } = useCallContext();

  if (!selectedCall) {
    return { isActive: false, status: "unknown" as const };
  }

  const call = selectedCall as any;

  if (call.isActive === undefined) {
    // Si no tiene campos de activación, asumir que está activa si status=OPEN
    return {
      isActive: call.status === "OPEN",
      status: call.status === "OPEN" ? ("active" as const) : ("closed" as const),
    };
  }

  const now = new Date();
  const startDate = call.startDate ? new Date(call.startDate) : null;
  const endDate = call.endDate ? new Date(call.endDate) : null;

  if (call.status !== "OPEN" || !call.isActive) {
    return { isActive: false, status: "inactive" as const };
  }

  if (startDate && now < startDate) {
    return { isActive: false, status: "scheduled" as const };
  }

  if (call.autoClose && endDate && now > endDate) {
    return { isActive: false, status: "expired" as const };
  }

  return { isActive: true, status: "active" as const };
}
