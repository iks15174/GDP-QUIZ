import { useState, useCallback } from 'react';

const FREE_PLAY_KEY = 'gdp_free_play_date';

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function useDailyFreePlay() {
  const [usedToday, setUsedToday] = useState(() => {
    return localStorage.getItem(FREE_PLAY_KEY) === today();
  });

  const canFreePlay = !usedToday;

  const consumeFreePlay = useCallback(() => {
    localStorage.setItem(FREE_PLAY_KEY, today());
    setUsedToday(true);
  }, []);

  return { canFreePlay, consumeFreePlay };
}
