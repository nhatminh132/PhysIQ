'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Wifi, WifiOff, Clock, AlertTriangle, Ban, RefreshCw } from 'lucide-react';

interface LockScreenProps {
  errorCode: string;
  errorMessage: string;
  isGracePeriod?: boolean;
  gracePeriodRemainingMs?: number | null;
  revokedAt?: string | null;
  revokedReason?: string | null;
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
  revokedAt,
  revokedReason,
  onRetry,
  onActivate,
  isLoading = false,
}: LockScreenProps) {
  const [activateKey, setActivateKey] = useState('');
  const [activateMode, setActivateMode] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activateMsg, setActivateMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
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

  const handleActivateWithToast = () => {
    if (!activateKey.trim()) {
      return;
    }
    onActivate?.(activateKey.trim());
  };

  const isRevoked = errorCode === 'LICENSE_REVOKED';
  const isGrace = isGracePeriod || (localRemaining !== null && localRemaining > 0);
  const isOffline = errorCode === 'OFFLINE' || errorCode === 'NETWORK_ERROR' || errorCode === 'NO_LICENSE';

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className={`w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
              isRevoked
                ? 'bg-red-500/20 animate-pulse'
                : isGrace
                ? 'bg-yellow-500/20'
                : 'bg-muted'
            }`}
          >
            {isRevoked ? (
              <Ban size={48} className="text-red-500" />
            ) : isGrace ? (
              <Clock size={40} className="text-yellow-500" />
            ) : isOffline ? (
              <WifiOff size={40} className="text-muted-foreground" />
            ) : (
              <Shield size={40} className="text-muted-foreground" />
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
          className={`p-5 rounded-lg mb-6 ${
            isRevoked
              ? 'bg-red-500/10 border-2 border-red-500/40'
              : 'bg-secondary/50 border border-border'
          }`}
        >
          {isRevoked && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Ban size={20} className="text-red-500" />
                <p className="text-red-500 font-bold text-lg">LICENSE BỊ KHÓA</p>
              </div>
              <p className="text-sm text-red-400/80">
                {errorMessage || 'License đã bị vô hiệu hóa bởi quản trị viên.'}
              </p>
            </div>
          )}

          {isRevoked && (revokedAt || revokedReason) && (
            <div className="space-y-2 mb-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              {revokedReason && (
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-red-400/60 uppercase tracking-wide">Lý do khóa</p>
                    <p className="text-sm text-red-300">{revokedReason}</p>
                  </div>
                </div>
              )}
              {revokedAt && (
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-red-400" />
                  <div>
                    <p className="text-xs text-red-400/60 uppercase tracking-wide">Thời gian khóa</p>
                    <p className="text-sm text-red-300">{formatDate(revokedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isRevoked && (
            <div className="flex items-start gap-3">
              <div className={`shrink-0 mt-0.5 ${isRevoked ? 'text-red-500/60' : 'text-muted-foreground'}`}>
                {isOffline ? <WifiOff size={16} /> : <Shield size={16} />}
              </div>
              <div>
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
          )}

          {isRevoked && (
            <div className="flex items-center gap-2 text-xs text-red-400/50 mt-3 pt-3 border-t border-red-500/20">
              <AlertTriangle size={12} />
              <span>Liên hệ chủ sở hữu để được cấp license mới hoặc làm rõ.</span>
            </div>
          )}
        </div>

        {isGrace && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-500/80 text-center">
              Ứng dụng đang chạy trong chế độ grace period. Hãy kết nối internet để xác thực license và tiếp tục sử dụng bình thường.
            </p>
          </div>
        )}

        {isRevoked ? (
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-foreground text-background font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('physiq_license_key');
                localStorage.removeItem('physiq_license_info');
                localStorage.removeItem('physiq_grace_end');
                localStorage.removeItem('physiq_grace_key');
                localStorage.removeItem('physiq_revoked_info');
                localStorage.removeItem('physiq_instance_id');
                window.location.reload();
              }}
              className="w-full py-3 px-4 border border-red-500/30 text-red-500/70 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
            >
              Xóa License &amp; Thử lại
            </button>
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
                onClick={() => { setActivateMode(false); setActivateKey(''); setActivateMsg(null); }}
                className="flex-1 py-3 px-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                disabled={activating}
              >
                Quay lại
              </button>
              <button
                onClick={() => {
                  if (activateKey.trim() && onActivate) {
                    setActivating(true);
                    setActivateMsg({type: 'success', text: 'Đang xác thực license...'});
                    onActivate(activateKey.trim());
                  }
                }}
                disabled={!activateKey.trim() || activating}
                className="flex-1 py-3 px-4 bg-foreground text-background font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {activating ? 'Đang xác thực...' : 'Kích hoạt'}
              </button>
            </div>

            {activateMsg && (
              <div className={`mt-4 p-3 rounded-lg text-sm text-center ${
                activateMsg.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
              }`}>
                {activateMsg.text}
              </div>
            )}
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
            <button
              onClick={() => setActivateMode(true)}
              className="w-full py-3 px-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors text-sm"
            >
              Nhập License Key
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('physiq_license_key');
                localStorage.removeItem('physiq_license_info');
                localStorage.removeItem('physiq_grace_end');
                localStorage.removeItem('physiq_grace_key');
                localStorage.removeItem('physiq_revoked_info');
                localStorage.removeItem('physiq_instance_id');
                window.location.reload();
              }}
              className="w-full py-3 px-4 border border-red-500/30 text-red-500/70 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
            >
              Xóa License &amp; Thử lại
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mt-8">
          <p className="text-center text-xs text-muted-foreground/40">
            PhysIQ License System v1.0
          </p>
          <p className="text-xs text-muted-foreground/40">v45</p>
        </div>
      </div>
    </div>
  );
}
