import { useEffect, useRef, useState } from 'react';
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
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

  // 컴포넌트 마운트 시 미리 로드
  useEffect(() => {
    loadAd();
    return () => unregisterRef.current?.();
  }, []);

  const showAd = (onWatched: () => void, onDismissed: () => void) => {
    if (!showFullScreenAd.isSupported() || !isAdLoaded) {
      // 광고 미지원 환경에서는 바로 계속하기
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
          loadAd(); // 다음 광고 미리 로드
          onDismissed();
        }
      },
      onError: () => onDismissed(),
    });
  };

  return { isAdLoaded, showAd, loadAd };
}
