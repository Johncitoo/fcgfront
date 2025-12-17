import { useState } from 'react';
import { Shield, Mail, User, Check, ArrowRight } from 'lucide-react';
import { apiPost } from '../../lib/api';

type FormStep = 'form' | 'verification';

export default function ReviewerManagementPage() {
  const [step, setStep] = useState<FormStep>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form data
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');

  // Verification data
  const [verificationCode, setVerificationCode] = useState('');

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validaciones
    if (!email || !fullName) {
      setError('Todos los campos son obligatorios');
      return;
    }

    // Generar contraseña automática
    const generatedPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).toUpperCase().slice(-4) + '!@#';
    const password = generatedPassword;

    setLoading(true);

    try {
      const response = await apiPost<{ requestId: string; message: string }>(
        '/admin/reviewers/request',
        {
          email,
          fullName,
          password, // Contraseña generada automáticamente
        }
      );

      setSuccess(response.message);
      setStep('verification');
    } catch (err: any) {
      setError(err.message || 'Error al solicitar creación de revisor');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Ingresa el código de 6 dígitos');
      return;
    }

    setLoading(true);

    try {
      const response = await apiPost<{ message: string; user: any }>(
        '/admin/reviewers/confirm',
        {
          code: verificationCode,
        }
      );

      setSuccess(response.message);
      
      // Limpiar formulario después de 3 segundos
      setTimeout(() => {
        setStep('form');
        setEmail('');
        setFullName('');
        setVerificationCode('');
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al confirmar creación de revisor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-purple-600" />
        <h1 className="text-3xl font-bold text-gray-900">
          Gestión de Revisores
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step === 'form'
                  ? 'bg-purple-600 text-white'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              {step === 'form' ? '1' : <Check className="h-6 w-6" />}
            </div>
            <span className="text-sm font-medium">Datos del revisor</span>
          </div>
          <ArrowRight className="h-5 w-5 mx-4 text-gray-400" />
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step === 'verification'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              2
            </div>
            <span className="text-sm font-medium">Verificación</span>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
            {success}
          </div>
        )}

        {/* Step 1: Form */}
        {step === 'form' && (
          <form onSubmit={handleSubmitRequest} className="space-y-6">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Nota:</strong> Se enviará un código de verificación a tu
                email. El usuario revisor recibirá sus credenciales por correo.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 inline mr-2" />
                Email del nuevo revisor
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="revisor@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-2" />
                Nombre completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Juan Pérez"
                required
              />
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Se generará automáticamente una contraseña segura para el revisor. 
                Las credenciales completas se enviarán por email al nuevo revisor.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Enviando...' : 'Solicitar Creación'}
            </button>
          </form>
        )}

        {/* Step 2: Verification */}
        {step === 'verification' && (
          <form onSubmit={handleConfirmCreation} className="space-y-6">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
              <p className="text-sm text-amber-800">
                Se ha enviado un código de 6 dígitos a tu email. Ingrésalo para
                confirmar la creación del revisor.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                Código de verificación
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                maxLength={6}
                pattern="\d{6}"
                autoFocus
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setVerificationCode('');
                  setError('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Confirmando...' : 'Confirmar Creación'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
