import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy } from 'react'

// Lazy helpers
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const ApplicantLayout = lazy(() => import('./layouts/ApplicantLayout'))
const RequireAuth = lazy(() => import('./components/RequireAuth'))

// Auth
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const EnterInviteCodePage = lazy(() => import('./pages/auth/EnterInviteCodePage'))
const SetPasswordPage = lazy(() => import('./pages/auth/SetPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))

// Sistema
const ForbiddenPage = lazy(() => import('./pages/system/ForbiddenPage'))
const NotFoundPage = lazy(() => import('./pages/system/NotFoundPage'))

// Admin
const AdminHome = lazy(() => import('./pages/admin/AdminHome'))
const ApplicantsListPage = lazy(() => import('./pages/admin/ApplicantsListPage'))
const ApplicantDetailPage = lazy(() => import('./pages/admin/ApplicantDetailPage'))
const CallsListPage = lazy(() => import('./pages/admin/CallsListPage'))
const CallDetailPage = lazy(() => import('./pages/admin/CallDetailPage'))
const InvitesPage = lazy(() => import('./pages/admin/InvitesPage'))
const FormDesignerPage = lazy(() => import('./pages/admin/FormDesignerPage'))
const EmailTemplatesPage = lazy(() => import('./pages/admin/EmailTemplatesPage'))
const EmailLogsPage = lazy(() => import('./pages/admin/EmailLogsPage'))
const ApplicationsListPage = lazy(() => import('./pages/admin/ApplicationsListPage'))
const ApplicationDetailPage = lazy(() => import('./pages/admin/ApplicationDetailPage'))
const AuditPage = lazy(() => import('./pages/admin/AuditPage'))
const FormSectionEditorPage = lazy(() => import('./pages/admin/FormSectionEditorPage'))

// Applicant
const ApplicantHome = lazy(() => import('./pages/applicant/ApplicantHome'))
const FormPage = lazy(() => import('./pages/applicant/FormPage'))
const FixesPage = lazy(() => import('./pages/applicant/FixesPage'))
const DocumentsPage = lazy(() => import('./pages/applicant/DocumentsPage'))

// Reviewer
const ReviewerHome = lazy(() => import('./pages/reviewer/ReviewerHome'))
const ApplicationFullFormPage = lazy(() => import('./pages/reviewer/ApplicationFullFormPage'))
const ApplicationHistoryPage = lazy(() => import('./pages/reviewer/ApplicationHistoryPage'))
const ApplicationReviewPage = lazy(() => import('./pages/reviewer/ApplicationReviewPage'))

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/auth/login" replace /> },

  // Auth
  { path: '/auth/login', element: <LoginPage /> },
  { path: '/auth/enter-invite', element: <EnterInviteCodePage /> },
  { path: '/auth/set-password', element: <SetPasswordPage /> },
  { path: '/auth/reset-password', element: <ResetPasswordPage /> },

  // Admin (protegido)
  {
  path: '/admin',
  element: <AdminLayout />, // ⚠️ sin RequireAuth temporalmente
  children: [
    { index: true, element: <AdminHome /> },
    { path: 'applicants', element: <ApplicantsListPage /> },
    { path: 'applicants/:id', element: <ApplicantDetailPage /> },
    { path: 'calls', element: <CallsListPage /> },
    { path: 'calls/:id', element: <CallDetailPage /> },
    { path: 'invites', element: <InvitesPage /> },
    { path: 'applications', element: <ApplicationsListPage /> },
    { path: 'applications/:id', element: <ApplicationDetailPage /> },
    { path: 'forms', element: <FormDesignerPage /> }, // ✅ nuevo diseñador de formularios
    { path: 'forms/:formId/sections/:sectionId', element: <FormSectionEditorPage /> },
    { path: 'email/templates', element: <EmailTemplatesPage /> },
    { path: 'email/logs', element: <EmailLogsPage /> },
    { path: 'audit', element: <AuditPage /> },
  ],
},


  // Applicant (protegido)
  {
    path: '/applicant',
    element: (
      <RequireAuth roles={['APPLICANT']}>
        <ApplicantLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <ApplicantHome /> },
      { path: 'form', element: <FormPage /> },
      { path: 'fixes', element: <FixesPage /> },
      { path: 'documents', element: <DocumentsPage /> },
    ],
  },

  // Reviewer (protegido)
  {
    path: '/reviewer',
    element: (
      <RequireAuth roles={['REVIEWER']}>
        <ReviewerHome />
      </RequireAuth>
    ),
  },
  {
    path: '/reviewer/application/:id',
    element: (
      <RequireAuth roles={['REVIEWER']}>
        <ApplicationFullFormPage />
      </RequireAuth>
    ),
  },
  {
    path: '/reviewer/application/:id/history',
    element: (
      <RequireAuth roles={['REVIEWER']}>
        <ApplicationHistoryPage />
      </RequireAuth>
    ),
  },
  {
    path: '/reviewer/application/:id/review',
    element: (
      <RequireAuth roles={['REVIEWER']}>
        <ApplicationReviewPage />
      </RequireAuth>
    ),
  },

  // Sistema
  { path: '/forbidden', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
])
