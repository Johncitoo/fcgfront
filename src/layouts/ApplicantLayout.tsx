import TopNav from '../components/TopNav'
import { Outlet } from 'react-router-dom'

export default function ApplicantLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav />
      <main className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
