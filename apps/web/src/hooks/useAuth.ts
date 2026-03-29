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

    const res = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationCode, referrer }),
    });

    if (!res.ok) throw new Error('로그인에 실패했어요.');

    const { userKey: key } = (await res.json()) as { userKey: string };
    localStorage.setItem(AUTH_KEY, key);
    setUserKey(key);
    return key;
  };

  return { userKey, login, isLoggedIn: !!userKey };
}
