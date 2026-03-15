import { useState, useCallback } from 'react';

// 앱 세션 내 유지 (미니앱 특성상 세션 중에 리셋되지 않음)
let _freePlayDate: string | null = null;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function useDailyFreePlay() {
  const [usedToday, setUsedToday] = useState(() => _freePlayDate === today());

  const canFreePlay = !usedToday;

  const consumeFreePlay = useCallback(() => {
    _freePlayDate = today();
    setUsedToday(true);
  }, []);

  return { canFreePlay, consumeFreePlay };
}
