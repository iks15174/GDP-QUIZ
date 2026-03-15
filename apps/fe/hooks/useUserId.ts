import { useEffect, useState } from 'react';

// 앱인토스 사용자 인증 후 실제 userId로 교체 가능
// 현재는 디바이스 고유 임시 ID를 사용
let cachedUserId: string | null = null;

function generateId(): string {
  return 'user_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(cachedUserId);

  useEffect(() => {
    if (cachedUserId) {
      setUserId(cachedUserId);
      return;
    }
    // TODO: 앱인토스 User.getProfile() 등으로 실제 유저 ID 교체
    const id = generateId();
    cachedUserId = id;
    setUserId(id);
  }, []);

  return userId;
}
