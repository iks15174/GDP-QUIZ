import { useState, useEffect } from 'react';
import { appLogin } from '@apps-in-toss/web-framework';
import config from '../config';

const AUTH_KEY = 'ait_user_key';

export function useAuth() {
  const [userKey, setUserKey] = useState<string | null>(() =>
    localStorage.getItem(AUTH_KEY),
  );
  const [validating, setValidating] = useState<boolean>(() => !!localStorage.getItem(AUTH_KEY));

  // 앱 시작 시 저장된 userKey가 유효한지 서버에 확인
  useEffect(() => {
    const storedKey = localStorage.getItem(AUTH_KEY);
    if (!storedKey) return;

    fetch(`${config.apiBaseUrl}/api/auth/me?userKey=${encodeURIComponent(storedKey)}`)
      .then((res) => {
        if (!res.ok) {
          // 연결 끊기 등으로 유효하지 않은 유저 → 로그아웃 처리
          localStorage.removeItem(AUTH_KEY);
          setUserKey(null);
        }
      })
      .catch(() => {
        // 네트워크 오류 시 기존 상태 유지 (오프라인 대응)
      })
      .finally(() => {
        setValidating(false);
      });
  }, []);

  const login = async (): Promise<string> => {
    const { authorizationCode, referrer } = await appLogin();
    console.log('[useAuth] appLogin 완료, authorizationCode:', authorizationCode?.slice(0, 10));

    const res = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationCode, referrer }),
    });

    if (!res.ok) throw new Error('로그인에 실패했어요.');

    const data = (await res.json()) as { userKey: string };
    console.log('[useAuth] 로그인 성공, userKey:', data.userKey?.slice(0, 10));
    localStorage.setItem(AUTH_KEY, data.userKey);
    setUserKey(data.userKey);
    return data.userKey;
  };

  return { userKey, login, isLoggedIn: !!userKey, validating };
}
