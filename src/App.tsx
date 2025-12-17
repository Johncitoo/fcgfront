// src/App.tsx
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

// Guard & context  
import RequireAuth from "./components/RequireAuth";
import { TokenRenewalModal } from "./components/TokenRenewalModal";
import { authService } from "./lib/auth";

// Layouts
import AdminLayout from "./layouts/AdminLayout";
import ApplicantLayout from "./layouts/ApplicantLayout";

//ola
// Auth
import LoginPage from "./pages/auth/LoginPage";
import PortalLoginPage from "./pages/auth/PortalLoginPage";
import SetPasswordPage from "./pages/auth/SetPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Sistema
import ForbiddenPage from "./pages/system/ForbiddenPage";
import NotFoundPage from "./pages/system/NotFoundPage";

// Admin
import AdminHome from "./pages/admin/AdminHome";
import ApplicantsListPage from "./pages/admin/ApplicantsListPage";
import ApplicantDetailPage from "./pages/admin/ApplicantDetailPage";
import CallsListPage from "./pages/admin/CallsListPage";
import CallDetailPage from "./pages/admin/CallDetailPage";
import InvitesPage from "./pages/admin/InvitesPage";
import FormsBuilderPage from "./pages/admin/FormsBuilderPage";
import EmailTemplatesPage from "./pages/admin/EmailTemplatesPage";
import EmailLogsPage from "./pages/admin/EmailLogsPage";
import SendAnnouncementsPage from "./pages/admin/SendAnnouncementsPage";
import ApplicationsListPage from "./pages/admin/ApplicationsListPage";
import ApplicationDetailPage from "./pages/admin/ApplicationDetailPage";
import AuditPage from "./pages/admin/AuditPage";
import FormSectionEditorPage from "./pages/admin/FormSectionEditorPage";
import InstitutionsPage from "./pages/admin/InstitutionsPage";
import MilestoneManagement from "./pages/admin/MilestoneManagement";
import SimpleFormBuilder from "./pages/admin/SimpleFormBuilder";
import FormBuilderV2 from "./pages/admin/FormBuilderV2";
import MilestoneCreator from "./pages/admin/MilestoneCreator";
import CallActivationManager from "./pages/admin/CallActivationManager";
import InviteApplicant from "./pages/admin/InviteApplicant";

import FinalSelection from "./pages/admin/FinalSelection";

// Applicant
import ApplicantHome from "./pages/applicant/ApplicantHome";
import FormPage from "./pages/applicant/FormPage";
import FixesPage from "./pages/applicant/FixesPage";
import DocumentsPage from "./pages/applicant/DocumentsPage";
import ApplicationForm from "./pages/applicant/ApplicationForm";

// Reviewer
import ReviewerHome from "./pages/reviewer/ReviewerHome";
import ApplicationFullFormPage from "./pages/reviewer/ApplicationFullFormPage";
import ApplicationHistoryPage from "./pages/reviewer/ApplicationHistoryPage";
import ApplicationReviewPage from "./pages/reviewer/ApplicationReviewPage";

function Ping() {
  return (
    <div style={{ padding: 24 }}>
      <nav style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Link to="/ping">/ping</Link>
        <Link to="/formulario">/formulario</Link>
        <Link to="/auth/login">/auth/login</Link>
      </nav>
      <h1>✅ PING OK</h1>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(5);

  useEffect(() => {
    // Validar y refrescar sesión al montar la app
    const validateSession = async () => {
      const isValid = await authService.validateAndRefreshSession();
      if (!isValid && authService.isAuthenticated()) {
        // Token expiró y no se pudo refrescar
        authService.clearAuth();
        navigate('/login', { replace: true });
      }
    };

    validateSession();

    // Configurar temporizador de renovación de token
    const timerId = authService.setupTokenRenewalTimer(() => {
      const timeLeft = authService.getTokenTimeToExpiry();
      setMinutesLeft(timeLeft / (60 * 1000)); // Convertir ms a minutos
      setShowRenewalModal(true);
    }, 5); // Advertir 5 minutos antes

    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [navigate]);

  const handleRenewToken = async () => {
    try {
      await authService.refreshAccessToken();
      setShowRenewalModal(false);
      
      // Configurar nuevo temporizador
      authService.setupTokenRenewalTimer(() => {
        const timeLeft = authService.getTokenTimeToExpiry();
        setMinutesLeft(timeLeft / (60 * 1000));
        setShowRenewalModal(true);
      }, 5);
    } catch (error) {
      console.error('Error al renovar token:', error);
      await handleLogout();
    }
  };

  const handleLogout = async () => {
    setShowRenewalModal(false);
    await authService.logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <TokenRenewalModal
        isOpen={showRenewalModal}
        minutesLeft={minutesLeft}
        onRenew={handleRenewToken}
        onLogout={handleLogout}
      />
      
      <Routes>
      {/* Redirección raíz */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Rutas públicas para probar sin login */}
      <Route path="/ping" element={<Ping />} />
      <Route path="/formulario" element={<ApplicationForm />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/portal" element={<PortalLoginPage />} />
      <Route path="/auth/login" element={<Navigate to="/login" replace />} />
      <Route path="/auth/set-password" element={<SetPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      {/* Admin (protegido) */}
      <Route
        path="/admin"
        element={
          <RequireAuth roles={["ADMIN"]}>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="applicants" element={<ApplicantsListPage />} />
        <Route path="applicants/:id" element={<ApplicantDetailPage />} />
        <Route path="calls" element={<CallsListPage />} />
        <Route path="calls/:id" element={<CallDetailPage />} />
        <Route path="invites" element={<InvitesPage />} />
        <Route path="applications" element={<ApplicationsListPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
        <Route path="forms" element={<FormsBuilderPage />} />
        <Route
          path="forms/:formId/sections/:sectionId"
          element={<FormSectionEditorPage />}
        />
        <Route path="email/templates" element={<EmailTemplatesPage />} />
        <Route path="email/logs" element={<EmailLogsPage />} />
        <Route path="email/announcements" element={<SendAnnouncementsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="institutions" element={<InstitutionsPage />} />
        <Route path="hitos" element={<MilestoneCreator />} />
        <Route path="formularios" element={<SimpleFormBuilder />} />
        <Route path="forms-v2" element={<FormBuilderV2 />} />
        <Route path="calls/:callId/milestones" element={<MilestoneManagement />} />
        <Route path="calls/:callId/selection" element={<FinalSelection />} />
        <Route path="activacion-convocatorias" element={<CallActivationManager />} />
        <Route path="invite-applicant" element={<InviteApplicant />} />
      </Route>

      {/* Applicant (protegido) */}
      <Route
        path="/applicant"
        element={
          <RequireAuth roles={["APPLICANT"]}>
            <ApplicantLayout />
          </RequireAuth>
        }
      >
        <Route index element={<ApplicantHome />} />
        <Route path="form" element={<FormPage />} />
        <Route path="fixes" element={<FixesPage />} />
        <Route path="documents" element={<DocumentsPage />} />
      </Route>

      {/* Reviewer (protegido) */}
      <Route
        path="/reviewer"
        element={
          <RequireAuth roles={["REVIEWER"]}>
            <ReviewerHome />
          </RequireAuth>
        }
      />
      <Route
        path="/reviewer/application/:id"
        element={
          <RequireAuth roles={["REVIEWER"]}>
            <ApplicationFullFormPage />
          </RequireAuth>
        }
      />
      <Route
        path="/reviewer/application/:id/history"
        element={
          <RequireAuth roles={["REVIEWER"]}>
            <ApplicationHistoryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/reviewer/application/:id/review"
        element={
          <RequireAuth roles={["REVIEWER"]}>
            <ApplicationReviewPage />
          </RequireAuth>
        }
      />

      {/* Sistema */}
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
