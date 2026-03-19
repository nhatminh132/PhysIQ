'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Wifi, WifiOff, Clock, AlertTriangle } from 'lucide-react';

interface LockScreenProps {
  errorCode: string;
  errorMessage: string;
  isGracePeriod?: boolean;
  gracePeriodRemainingMs?: number | null;
  onRetry?: () => void;
  onActivate?: (key: string) => void;
  isLoading?: boolean;
}

function formatGraceTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default function LockScreen({
  errorCode,
  errorMessage,
  isGracePeriod = false,
  gracePeriodRemainingMs,
  onRetry,
  onActivate,
  isLoading = false,
}: LockScreenProps) {
  const [activateKey, setActivateKey] = useState('');
  const [activateMode, setActivateMode] = useState(false);
  const [localRemaining, setLocalRemaining] = useState<number | null>(gracePeriodRemainingMs ?? null);

  useEffect(() => {
    if (gracePeriodRemainingMs) {
      setLocalRemaining(gracePeriodRemainingMs);
      const interval = setInterval(() => {
        setLocalRemaining((prev: number | null) => {
          if (prev === null) return null;
          const next = prev - 1000;
          return next > 0 ? next : 0;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gracePeriodRemainingMs]);

  const handleActivate = useCallback(() => {
    if (activateKey.trim() && onActivate) {
      onActivate(activateKey.trim());
    }
  }, [activateKey, onActivate]);

  const isRevoked = errorCode === 'LICENSE_INVALID' || errorCode === 'LICENSE_REVOKED';
  const isGrace = isGracePeriod || localRemaining !== null && localRemaining > 0;
  const isOffline = errorCode === 'OFFLINE' || errorCode === 'NETWORK_ERROR' || errorCode === 'NO_LICENSE' || errorCode === 'NETWORK_ERROR';

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
              isRevoked
                ? 'bg-red-500/20'
                : isGrace
                ? 'bg-yellow-500/20'
                : 'bg-muted'
            }`}
          >
            {isRevoked ? (
              <Shield size={40} className="text-red-500" />
            ) : isGrace ? (
              <Clock size={40} className="text-yellow-500" />
            ) : isOffline ? (
              <WifiOff size={40} className="text-muted-foreground" />
            ) : (
              <Wifi size={40} className="text-muted-foreground" />
            )}
          </div>

          <h1 className="text-3xl font-bold mb-2">
            {isRevoked
              ? 'License Bị Khóa'
              : isGrace
              ? 'Chế độ Grace Period'
              : 'Không có License'}
          </h1>

          {isGrace && localRemaining !== null && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <Clock size={16} className="text-yellow-500" />
              <span className="text-yellow-500 font-mono text-lg">
                Còn lại: {formatGraceTime(localRemaining ?? 0)}
              </span>
            </div>
          )}
        </div>

        <div
          className={`p-4 rounded-lg mb-6 ${
            isRevoked
              ? 'bg-red-500/10 border border-red-500/30'
              : 'bg-secondary/50 border border-border'
          }`}
        >
          {isRevoked && (
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-500 font-semibold text-sm">License đã bị vô hiệu hóa</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {errorMessage || 'Liên hệ chủ sở hữu để được hỗ trợ.'}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className={`shrink-0 mt-0.5 ${isRevoked ? 'text-red-500/60' : 'text-muted-foreground'}`}>
              {isOffline ? <WifiOff size={16} /> : <Shield size={16} />}
            </div>
            <div className={isRevoked ? '' : ''}>
              <p className={`text-sm font-medium ${isRevoked ? 'text-red-400/80' : 'text-muted-foreground'}`}>
                {errorMessage}
              </p>
              {errorCode && (
                <p className="text-xs text-muted-foreground/50 mt-1 font-mono">
                  Error: {errorCode}
                </p>
              )}
            </div>
          </div>
        </div>

        {isGrace && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-500/80 text-center">
              Ứng dụng đang chạy trong chế độ grace period. Hãy kết nối internet để xác thực license và tiếp tục sử dụng bình thường.
            </p>
          </div>
        )}

        {isRevoked ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-destructive/80 text-center">
              Bạn không thể sử dụng ứng dụng này. Vui lòng liên hệ chủ sở hữu để được cấp license mới.
            </p>
          </div>
        ) : activateMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nhập License Key của bạn
              </label>
              <input
                type="text"
                value={activateKey}
                onChange={(e) => setActivateKey(e.target.value.toUpperCase())}
                placeholder="PHY-XXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full p-3 border border-border bg-secondary/30 rounded-lg text-center font-mono tracking-wider"
                autoFocus
                disabled={isLoading}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setActivateMode(false)}
                className="flex-1 py-3 px-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                disabled={isLoading}
              >
                Quay lại
              </button>
              <button
                onClick={handleActivate}
                disabled={!activateKey.trim() || isLoading}
                className="flex-1 py-3 px-4 bg-foreground text-background font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? 'Đang xác thực...' : 'Kích hoạt'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {isGrace && onRetry && (
              <button
                onClick={onRetry}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-foreground text-background font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Wifi size={18} />
                {isLoading ? 'Đang kiểm tra...' : 'Kết nối lại'}
              </button>
            )}
            {!isRevoked && (
              <button
                onClick={() => setActivateMode(true)}
                className="w-full py-3 px-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors text-sm"
              >
                Nhập License Key
              </button>
            )}
            <button
              onClick={() => {
                localStorage.removeItem('physiq_license_key');
                localStorage.removeItem('physiq_license_info');
                localStorage.removeItem('physiq_grace_end');
                localStorage.removeItem('physiq_grace_key');
                localStorage.removeItem('physiq_instance_id');
                window.location.reload();
              }}
              className="w-full py-3 px-4 border border-red-500/30 text-red-500/70 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
            >
              Xóa License &amp; Thử lại
            </button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/40 mt-8">
          PhysIQ License System v1.0
        </p>
      </div>
    </div>
  );
}
