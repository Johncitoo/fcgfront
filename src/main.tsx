// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { CallProvider } from "./contexts/CallContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ConfirmProvider } from "./contexts/ConfirmContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { router } from "./router";
import "./index.css";

// Manejar errores de importación dinámica globalmente
window.addEventListener('error', (event) => {
  if (
    event.message?.includes('dynamically imported module') ||
    event.message?.includes('Failed to fetch') ||
    event.message?.includes('Loading chunk')
  ) {
    console.warn('Error de módulo dinámico detectado, recargando...')
    event.preventDefault()
    window.location.reload()
  }
})

// Manejar rechazos de promesas no capturados
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message?.includes('dynamically imported module') ||
    event.reason?.message?.includes('Failed to fetch') ||
    event.reason?.message?.includes('Loading chunk')
  ) {
    console.warn('Error de módulo dinámico detectado en promesa, recargando...')
    event.preventDefault()
    window.location.reload()
  }
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <CallProvider>
            <RouterProvider router={router} />
          </CallProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
