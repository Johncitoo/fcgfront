import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { apiPost } from '../lib/api';

export default function ChangePasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token no encontrado en la URL');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!token) {
      setError('Token no válido');
      return;
    }

    setLoading(true);

    try {
      await apiPost('/password-change/reset', {
        token,
        newPassword,
      });

      setSuccess(true);

      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate('/auth/login', { replace: true });
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-slate-50 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40"></div>
      
      <div className="flex min-h-screen items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-600/50 mb-6">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Cambiar Contraseña
            </h1>
            <p className="text-base text-slate-300 mt-2">
              Ingresa tu nueva contraseña
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-sm text-slate-900 shadow-2xl border border-slate-200/50 rounded-lg p-6">
            {success ? (
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="bg-green-100 rounded-full p-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">¡Contraseña cambiada!</h3>
                <p className="text-gray-600 mb-6">
                  Tu contraseña se ha actualizado correctamente. Redirigiendo al inicio de sesión...
                </p>
                <div className="flex justify-center">
                  <Loader className="w-6 h-6 text-sky-600 animate-spin" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <p className="text-sm text-gray-800 mb-4 font-medium">
                  Por tu seguridad, elige una contraseña fuerte que incluya letras, números y símbolos.
                </p>
                
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="mb-4">
                  <label htmlFor="newPassword" className="text-gray-900 font-semibold text-sm block mb-1">
                    Nueva contraseña
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    disabled={loading}
                    className="mt-1 text-gray-900 placeholder:text-gray-400 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    minLength={8}
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="confirmPassword" className="text-gray-900 font-semibold text-sm block mb-1">
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirma tu contraseña"
                    required
                    disabled={loading}
                    className="mt-1 text-gray-900 placeholder:text-gray-400 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    minLength={8}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/auth/login')}
                    disabled={loading}
                    className="flex-1 text-gray-900 font-semibold hover:bg-gray-100 py-2 px-4 rounded-lg border border-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newPassword.trim() || !confirmPassword.trim()}
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        Cambiando...
                      </span>
                    ) : (
                      'Cambiar contraseña'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-xs text-slate-400">
            © 2025 Fundación Carmen Goudie
          </div>
        </div>
      </div>
    </div>
  );
}
