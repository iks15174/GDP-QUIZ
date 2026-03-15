import { useState } from 'react';

const USER_ID_KEY = 'gdp_user_id';

function generateId(): string {
  return 'user_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useUserId(): string {
  const [userId] = useState<string>(() => {
    const stored = localStorage.getItem(USER_ID_KEY);
    if (stored) return stored;
    const id = generateId();
    localStorage.setItem(USER_ID_KEY, id);
    return id;
  });

  return userId;
}
