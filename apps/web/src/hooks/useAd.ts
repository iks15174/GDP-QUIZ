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

    showFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === 'userEarnedReward') {
          onWatched();
        }
        if (event.type === 'dismissed') {
          setIsAdLoaded(false);
          loadAd();
          onDismissed();
        }
      },
      onError: () => onDismissed(),
    });
  };

  return { isAdLoaded, showAd, loadAd };
}
