import { useEffect, useRef, useState } from 'react';
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import config from '../config';

const AD_GROUP_ID = config.adGroupId;

export function useAd() {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const unregisterRef = useRef<(() => void) | null>(null);

  const loadAd = () => {
    if (!loadFullScreenAd.isSupported()) return;

    unregisterRef.current?.();
    setIsAdLoaded(false);

    const unregister = loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === 'loaded') setIsAdLoaded(true);
      },
      onError: () => setIsAdLoaded(false),
    });
    unregisterRef.current = unregister;
  };

  useEffect(() => {
    loadAd();
    return () => unregisterRef.current?.();
  }, []);

  const showAd = (onWatched: () => void, onDismissed: () => void) => {
    if (!showFullScreenAd.isSupported() || !isAdLoaded) {
      onWatched();
      return;
    }

    let rewarded = false;

    showFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === 'userEarnedReward') {
          rewarded = true;
          onWatched();
        }
        if (event.type === 'dismissed') {
          setIsAdLoaded(false);
          loadAd();
          if (!rewarded) {
            // 일반 전면 광고: userEarnedReward 없이 dismissed만 오는 경우
            onWatched();
          }
        }
      },
      onError: () => onDismissed(),
    });
  };

  return { isAdLoaded, showAd, loadAd };
}
