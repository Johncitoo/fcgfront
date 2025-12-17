/**
 * Configuración de rutas de la aplicación usando React Router v6.
 * 
 * Estructura de rutas:
 * - /auth/* - Autenticación (login, set-password, reset-password)
 * - /admin/* - Panel de administración (protegido con RequireAuth ADMIN)
 * - /reviewer/* - Panel de revisores (protegido con RequireAuth REVIEWER)
 * - /applicant/* - Portal de postulantes (protegido con RequireAuth APPLICANT)
 * - /system/* - Páginas de sistema (403, 404)
 * - /demo/* - Páginas de prueba
 * 
 * Lazy loading:
 * Todos los componentes usan React.lazy() para code splitting.
 * Reduce bundle size inicial y mejora tiempo de carga.
 * 
 * Protección:
 * Rutas protegidas con componente RequireAuth que valida JWT y rol.
 * 
 * @module router
 */

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy } from 'react'

// Lazy helpers
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const ReviewerLayout = lazy(() => import('./layouts/ReviewerLayout'))
const ApplicantLayout = lazy(() => import('./layouts/ApplicantLayout'))
const RequireAuth = lazy(() => import('./components/RequireAuth'))

// Auth
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const SetPasswordPage = lazy(() => import('./pages/auth/SetPasswordPage'))
const ResetPasswordWithTokenPage = lazy(() => import('./pages/auth/ResetPasswordWithTokenPage'))

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
const EmailTemplatesPage = lazy(() => import('./pages/admin/EmailTemplatesPage'))
const EmailLogsPage = lazy(() => import('./pages/admin/EmailLogsPage'))
const SendAnnouncementsPage = lazy(() => import('./pages/admin/SendAnnouncementsPage'))
const ApplicationsListPage = lazy(() => import('./pages/admin/ApplicationsListPage'))
const ApplicationDetailPage = lazy(() => import('./pages/admin/ApplicationDetailPage'))
const AuditPage = lazy(() => import('./pages/admin/AuditPage'))
const FormSectionEditorPage = lazy(() => import('./pages/admin/FormSectionEditorPage'))
const InstitutionsPage = lazy(() => import('./pages/admin/InstitutionsPage'))
const MilestoneManagement = lazy(() => import('./pages/admin/MilestoneManagement'))
const MilestonesManagementPage = lazy(() => import('./pages/admin/MilestonesManagementPage'))
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'))
const ReviewerManagementPage = lazy(() => import('./pages/admin/ReviewerManagementPage'))
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'))
const FormBuilderV2 = lazy(() => import('./pages/admin/FormBuilderV2'))
const SimpleFormBuilder = lazy(() => import('./pages/admin/SimpleFormBuilder'))
const FormTemplatesPage = lazy(() => import('./pages/admin/FormTemplatesPage'))

// Applicant
const ApplicantHome = lazy(() => import('./pages/applicant/ApplicantHome'))
const FormPage = lazy(() => import('./pages/applicant/FormPage'))
const MilestoneFormPage = lazy(() => import('./pages/applicant/MilestoneFormPage'))
const FixesPage = lazy(() => import('./pages/applicant/FixesPage'))
const DocumentsPage = lazy(() => import('./pages/applicant/DocumentsPage'))

// Demo
const FileUploadDemo = lazy(() => import('./pages/demo/FileUploadDemo'))
const TestPage = lazy(() => import('./pages/demo/TestPage'))

// Reviewer
const ReviewerHome = lazy(() => import('./pages/reviewer/ReviewerHome'))
const ApplicationFullFormPage = lazy(() => import('./pages/reviewer/ApplicationFullFormPage'))
const ApplicationHistoryPage = lazy(() => import('./pages/reviewer/ApplicationHistoryPage'))
const ApplicationReviewPage = lazy(() => import('./pages/reviewer/ApplicationReviewPage'))

// Public
const PublicFormPage = lazy(() => import('./pages/public/PublicFormPage'))

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/auth/login" replace /> },

  // Auth
  { path: '/auth/login', element: <LoginPage /> },
  { path: '/auth/set-password', element: <SetPasswordPage /> },
  { path: '/auth/reset-password', element: <ResetPasswordWithTokenPage /> },
  { path: '/change-password/:token', element: <ChangePasswordPage /> },

  // Public - Vista previa de formulario de convocatoria activa
  { path: '/form', element: <PublicFormPage /> },
  
  // Demo público de file upload
  { path: '/demo/test', element: <TestPage /> },
  { path: '/demo/files', element: <FileUploadDemo /> },

  // Admin (protegido)
  {
  path: '/admin',
  element: (
    <RequireAuth roles={['ADMIN']}>
      <AdminLayout />
    </RequireAuth>
  ),
  children: [
    { index: true, element: <AdminHome /> },
    { path: 'applicants', element: <ApplicantsListPage /> },
    { path: 'applicants/:id', element: <ApplicantDetailPage /> },
    { path: 'calls', element: <CallsListPage /> },
    { path: 'calls/:id', element: <CallDetailPage /> },
    { path: 'invites', element: <InvitesPage /> },
    { path: 'institutions', element: <InstitutionsPage /> },
    { path: 'user-management', element: <UserManagementPage /> },
    { path: 'reviewer-management', element: <ReviewerManagementPage /> },
    { path: 'applications', element: <ApplicationsListPage /> },
    { path: 'applications/:id', element: <ApplicationDetailPage /> },
    { path: 'milestones', element: <MilestonesManagementPage /> }, // Gestión de hitos/fases
    { path: 'forms-builder', element: <SimpleFormBuilder /> }, // NUEVO diseñador super simple
    { path: 'form-templates', element: <FormTemplatesPage /> }, // Plantillas reutilizables
    { path: 'forms', element: <SimpleFormBuilder /> }, // Usar SimpleFormBuilder que funciona bien
    { path: 'forms-v2', element: <FormBuilderV2 /> }, // antiguo v2
    { path: 'forms/:formId/sections/:sectionId', element: <FormSectionEditorPage /> },
    { path: 'email/templates', element: <EmailTemplatesPage /> },
    { path: 'email/logs', element: <EmailLogsPage /> },
    { path: 'email/announcements', element: <SendAnnouncementsPage /> },
    { path: 'audit', element: <AuditPage /> },
    { path: 'calls/:callId/milestones', element: <MilestoneManagement /> }, // Configuración de hitos
    { path: 'demo/files', element: <FileUploadDemo /> }, // Demo de file upload
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
      { path: 'form/:id', element: <FormPage /> },
      { path: 'milestone/:milestoneProgressId', element: <MilestoneFormPage /> },
      { path: 'fixes', element: <FixesPage /> },
      { path: 'documents', element: <DocumentsPage /> },
    ],
  },

  // Reviewer (protegido) - Panel completo reutilizando componentes de admin
  {
    path: '/reviewer',
    element: (
      <RequireAuth roles={['REVIEWER']}>
        <ReviewerLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <ReviewerHome /> },
      { path: 'applicants', element: <ApplicantsListPage /> },
      { path: 'applicants/:id', element: <ApplicantDetailPage /> },
      { path: 'calls', element: <CallsListPage /> },
      { path: 'calls/:id', element: <CallDetailPage /> },
      { path: 'invites', element: <InvitesPage /> },
      { path: 'institutions', element: <InstitutionsPage /> },
      { path: 'applications', element: <ApplicationsListPage /> },
      { path: 'applications/:id', element: <ApplicationDetailPage /> },
      { path: 'application/:id', element: <ApplicationFullFormPage /> },
      { path: 'application/:id/history', element: <ApplicationHistoryPage /> },
      { path: 'application/:id/review', element: <ApplicationReviewPage /> },
      { path: 'milestones', element: <MilestonesManagementPage /> },
      { path: 'forms-builder', element: <SimpleFormBuilder /> },
      { path: 'form-templates', element: <FormTemplatesPage /> }, // Plantillas para reviewers
      { path: 'forms', element: <SimpleFormBuilder /> }, // Usar SimpleFormBuilder que funciona bien
      { path: 'forms/:formId/sections/:sectionId', element: <FormSectionEditorPage /> },
      { path: 'email/logs', element: <EmailLogsPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'calls/:callId/milestones', element: <MilestoneManagement /> },
    ],
  },

  // Sistema
  { path: '/forbidden', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
])
