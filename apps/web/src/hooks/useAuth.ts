import { useState } from 'react';
import { appLogin } from '@apps-in-toss/web-framework';
import config from '../config';

const AUTH_KEY = 'ait_user_key';

export function useAuth() {
  const [userKey, setUserKey] = useState<string | null>(() =>
    localStorage.getItem(AUTH_KEY),
  );

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

  return { userKey, login, isLoggedIn: !!userKey };
}
