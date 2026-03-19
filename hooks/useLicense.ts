'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type LicenseStatus = 'loading' | 'valid' | 'invalid' | 'locked' | 'grace_period';

export interface LicenseInfo {
  licenseKey: string;
  ownerName?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  quizSetId?: string;
}

export interface LicenseError {
  code: string;
  message: string;
  revokedAt?: string;
  revokedReason?: string;
}

interface UseLicenseReturn {
  status: LicenseStatus;
  licenseInfo: LicenseInfo | null;
  error: LicenseError | null;
  isValid: boolean;
  isLoading: boolean;
  checkLicense: () => Promise<void>;
  isInGracePeriod: boolean;
  gracePeriodRemainingMs: number | null;
}

const GRACE_PERIOD_MS = parseInt(process.env.NEXT_PUBLIC_LICENSE_GRACE_PERIOD_MS || '86400000', 10);
const CHECKIN_INTERVAL_MS = parseInt(process.env.NEXT_PUBLIC_LICENSE_CHECKIN_INTERVAL_MS || '15000', 10);

function generateInstanceId(): string {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('physiq_instance_id') : null;
  if (stored) return stored;

  const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem('physiq_instance_id', id);
  }
  return id;
}

export function useLicense(licenseKey: string | null): UseLicenseReturn {
  const [status, setStatus] = useState<LicenseStatus>('loading');
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [error, setError] = useState<LicenseError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gracePeriodEnd, setGracePeriodEnd] = useState<number | null>(null);
  const checkinTimerRef = useRef<NodeJS.Timeout | null>(null);
  const graceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (checkinTimerRef.current) {
      clearInterval(checkinTimerRef.current);
      checkinTimerRef.current = null;
    }
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
  }, []);

  const enterGracePeriod = useCallback((durationMs: number) => {
    const endTime = Date.now() + durationMs;
    setGracePeriodEnd(endTime);
    setStatus('grace_period');
    localStorage.setItem('physiq_grace_end', String(endTime));
    localStorage.setItem('physiq_grace_key', licenseKey || '');

    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    graceTimerRef.current = setTimeout(() => {
      localStorage.removeItem('physiq_grace_end');
      localStorage.removeItem('physiq_grace_key');
      setStatus('locked');
      setError({ code: 'GRACE_EXPIRED', message: 'Grace period đã hết. Vui lòng kết nối internet để tiếp tục.' });
    }, durationMs);
  }, [licenseKey]);

  const checkLicense = useCallback(async () => {
    let key = licenseKey || localStorage.getItem('physiq_license_key') || undefined;
    
    if (!key) {
      const revokedInfo = localStorage.getItem('physiq_revoked_info');
      if (revokedInfo) {
        try {
          const info = JSON.parse(revokedInfo);
          setError({
            code: 'LICENSE_REVOKED',
            message: 'License đã bị vô hiệu hóa.',
            revokedAt: info.revokedAt,
            revokedReason: info.revokedReason,
          });
          setStatus('locked');
          setIsLoading(false);
          return;
        } catch { /* ignore */ }
      }
      setStatus('invalid');
      setError({ code: 'NO_LICENSE', message: 'Vui lòng nhập license key để tiếp tục.' });
      setIsLoading(false);
      return;
    }

    if (!navigator.onLine) {
      const graceEnd = localStorage.getItem('physiq_grace_end');
      const graceKey = localStorage.getItem('physiq_grace_key');
      if (graceEnd && graceKey === key) {
        const remaining = parseInt(graceEnd, 10) - Date.now();
        if (remaining > 0) {
          enterGracePeriod(remaining);
          const cachedInfo = localStorage.getItem('physiq_license_info');
          if (cachedInfo) {
            try {
              setLicenseInfo(JSON.parse(cachedInfo));
            } catch { /* ignore */ }
          }
          setIsLoading(false);
          return;
        }
      }
      setStatus('locked');
      setError({ code: 'OFFLINE', message: 'Vui lòng kết nối internet để sử dụng.' });
      setIsLoading(false);
      return;
    }

    try {
      console.log('Starting license check for:', key);
      const instanceId = generateInstanceId();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/license/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: key,
          instance_id: instanceId,
          domain: typeof window !== 'undefined' ? window.location.hostname : '',
          user_agent: typeof window !== 'undefined' ? navigator.userAgent : '',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      console.log('License check response:', data);

      localStorage.removeItem('physiq_revoked_info');

      if (data.success) {
        localStorage.setItem('physiq_license_key', key);
        localStorage.setItem('physiq_license_info', JSON.stringify({
          licenseKey: data.license_key,
          ownerName: data.owner_name,
          expiresAt: data.expires_at,
          metadata: data.metadata,
          quizSetId: data.quiz_set_id,
        }));

        setLicenseInfo({
          licenseKey: data.license_key,
          ownerName: data.owner_name,
          expiresAt: data.expires_at,
          metadata: data.metadata,
          quizSetId: data.quiz_set_id,
        });
        setStatus('valid');
        console.log('License status set to valid');
        setError(null);
        setGracePeriodEnd(null);
        setIsLoading(false);
        console.log('isLoading set to false');
        localStorage.removeItem('physiq_grace_end');
        localStorage.removeItem('physiq_grace_key');

        if (checkinTimerRef.current) clearInterval(checkinTimerRef.current);
        checkinTimerRef.current = setInterval(checkLicense, CHECKIN_INTERVAL_MS);
      } else {
        if (data.error === 'LICENSE_REVOKED') {
          clearTimers();
          localStorage.removeItem('physiq_grace_end');
          localStorage.removeItem('physiq_grace_key');
          localStorage.setItem('physiq_revoked_info', JSON.stringify({
            revokedAt: data.revoked_at,
            revokedReason: data.revoked_reason,
          }));
          setStatus('locked');
          setError({
            code: data.error,
            message: data.message || 'License đã bị vô hiệu hóa.',
            revokedAt: data.revoked_at,
            revokedReason: data.revoked_reason,
          });
        } else {
          clearTimers();
          enterGracePeriod(GRACE_PERIOD_MS);
          setError({ code: data.error, message: data.message });
        }
      }
    } catch (err) {
      console.error('License check failed:', err);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      
      const graceEnd = localStorage.getItem('physiq_grace_end');
      const graceKey = localStorage.getItem('physiq_grace_key');
      if (graceEnd && key && graceKey === key) {
        const remaining = parseInt(graceEnd, 10) - Date.now();
        if (remaining > 0) {
          enterGracePeriod(remaining);
          setStatus('grace_period');
        } else {
          setStatus('locked');
          setError({ code: 'TIMEOUT', message: isAbort ? 'Kết nối bị timeout. Kiểm tra Supabase URL.' : 'Không thể kết nối đến server xác thực.' });
        }
      } else if (key) {
        enterGracePeriod(GRACE_PERIOD_MS);
        setError({ code: 'TIMEOUT', message: isAbort ? 'Kết nối bị timeout. Kiểm tra Supabase URL.' : 'Không thể kết nối đến server.' });
      } else {
        setStatus('locked');
        setError({ code: 'TIMEOUT', message: isAbort ? 'Kết nối bị timeout. Kiểm tra Supabase URL.' : 'Không thể kết nối đến server xác thực.' });
      }
    }
  }, [licenseKey, enterGracePeriod, clearTimers]);

  useEffect(() => {
    checkLicense();

    const handleOnline = () => {
      if (status === 'grace_period' || status === 'locked') {
        checkLicense();
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      clearTimers();
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const isValid = status === 'valid' || status === 'grace_period';
  const isInGracePeriod = status === 'grace_period';
  const gracePeriodRemainingMs = gracePeriodEnd ? Math.max(0, gracePeriodEnd - Date.now()) : null;

  return {
    status,
    licenseInfo,
    error,
    isValid,
    isLoading,
    checkLicense,
    isInGracePeriod,
    gracePeriodRemainingMs,
  };
}
