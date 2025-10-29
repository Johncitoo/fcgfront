import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { CallProvider } from './contexts/CallContext'
import './index.css'

function Fallback() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-slate-700">Cargando…</div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CallProvider>
      <Suspense fallback={<Fallback />}>
        <RouterProvider router={router} />
      </Suspense>
    </CallProvider>
  </React.StrictMode>,
)
