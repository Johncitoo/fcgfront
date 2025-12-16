import { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';

interface AccountQuotaStatus {
  name: string;
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  resetAt: Date;
}

interface DualEmailQuotaStatus {
  account1: AccountQuotaStatus;
  account2: AccountQuotaStatus;
  total: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
}

export function DualEmailQuotaWidget() {
  const [quotaStatus, setQuotaStatus] = useState<DualEmailQuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotaStatus = async () => {
    try {
      const data = await apiGet<DualEmailQuotaStatus>('/email/quota/dual');
      setQuotaStatus(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar estado de cuota');
      console.error('Error fetching quota:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotaStatus();
    
    // Auto-refresh cada 5 minutos
    const interval = setInterval(fetchQuotaStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !quotaStatus) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">
          <p className="font-semibold">⚠️ Error</p>
          <p className="text-sm">{error || 'No se pudo cargar el estado'}</p>
        </div>
      </div>
    );
  }

  const getColorClasses = (percentage: number) => {
    if (percentage >= 90) return { bg: 'bg-red-500', text: 'text-red-700', border: 'border-red-200' };
    if (percentage >= 80) return { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-200' };
    if (percentage >= 50) return { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200' };
    return { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-200' };
  };

  const formatResetTime = (resetAt: Date) => {
    const now = new Date();
    const reset = new Date(resetAt);
    const hoursUntilReset = Math.floor((reset.getTime() - now.getTime()) / (1000 * 60 * 60));
    return `${hoursUntilReset}h`;
  };

  const AccountBar = ({ account }: { account: AccountQuotaStatus }) => {
    const colors = getColorClasses(account.percentage);
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-gray-900">{account.name}</h4>
            <p className="text-sm text-gray-600">
              {account.used} / {account.limit} emails
              <span className="ml-2 text-xs text-gray-500">
                (quedan {account.remaining})
              </span>
            </p>
          </div>
          <span className={`text-2xl font-bold ${colors.text}`}>
            {account.percentage}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`${colors.bg} h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2`}
            style={{ width: `${Math.min(account.percentage, 100)}%` }}
          >
            {account.percentage > 15 && (
              <span className="text-xs font-semibold text-white">
                {account.used}
              </span>
            )}
          </div>
        </div>
        
        {account.percentage >= 80 && (
          <div className={`text-xs ${colors.text} bg-${colors.bg.split('-')[1]}-50 border ${colors.border} rounded px-2 py-1`}>
            {account.percentage >= 90 ? '🚨 Cuota casi agotada' : '⚠️ Cuota limitada'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            📧 Cuota de Emails
          </h3>
          <p className="text-sm text-gray-600">
            Estado en tiempo real de envíos diarios
          </p>
        </div>
        <button
          onClick={fetchQuotaStatus}
          className="text-sky-600 hover:text-sky-700 text-sm font-medium"
          title="Actualizar"
        >
          🔄
        </button>
      </div>

      {/* Cuenta 1 - Transaccional */}
      <AccountBar account={quotaStatus.account1} />

      {/* Cuenta 2 - Masivos */}
      <AccountBar account={quotaStatus.account2} />

      {/* Divider */}
      <div className="border-t border-gray-200 pt-4">
        {/* Total Summary */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="font-semibold text-gray-900">Total Combinado</h4>
            <p className="text-sm text-gray-600">
              {quotaStatus.total.used} / {quotaStatus.total.limit} emails
            </p>
          </div>
          <span className={`text-2xl font-bold ${getColorClasses(quotaStatus.total.percentage).text}`}>
            {quotaStatus.total.percentage}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`${getColorClasses(quotaStatus.total.percentage).bg} h-3 rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(quotaStatus.total.percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span>
          Reset en: {formatResetTime(quotaStatus.account1.resetAt)}
        </span>
        <span>
          Quedan: {quotaStatus.total.remaining} emails
        </span>
      </div>

      {/* Critical Warning */}
      {quotaStatus.total.percentage >= 95 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-start">
            <span className="text-2xl mr-3">🚨</span>
            <div>
              <p className="font-semibold text-red-800">Cuota crítica</p>
              <p className="text-sm text-red-700">
                Solo quedan {quotaStatus.total.remaining} emails disponibles. 
                El sistema bloqueará envíos al alcanzar el límite.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
