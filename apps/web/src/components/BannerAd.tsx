import { useEffect, useRef, useState } from 'react';
import { TossAds } from '@apps-in-toss/web-framework';
import config from '../config';

export function BannerAd() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasAd, setHasAd] = useState(false);

  useEffect(() => {
    if (!TossAds.initialize.isSupported()) return;
    TossAds.initialize({
      callbacks: {
        onInitialized: () => setIsInitialized(true),
        onInitializationFailed: () => {},
      },
    });
  }, []);

  useEffect(() => {
    if (!isInitialized || !containerRef.current) return;
    if (!TossAds.attachBanner.isSupported()) return;

    const attached = TossAds.attachBanner(config.bannerAdGroupId, containerRef.current, {
      theme: 'auto',
      tone: 'blackAndWhite',
      variant: 'expanded',
      callbacks: {
        onAdRendered: () => setHasAd(true),
        onNoFill: () => setHasAd(false),
        onAdFailedToRender: () => setHasAd(false),
      },
    });

    return () => {
      attached?.destroy();
    };
  }, [isInitialized]);

  return (
    <div style={{ width: '100%', height: hasAd ? 96 : 0, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: 96 }} />
    </div>
  );
}
