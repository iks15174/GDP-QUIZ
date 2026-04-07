const config = {
  apiBaseUrl: import.meta.env.DEV ? 'http://localhost:4000' : 'https://34-173-234-88.nip.io',
  adGroupId: 'ait.dev.43daa14da3ae487b',           // TODO: 운영 빌드 시 'ait.v2.live.b97a91f57cc148e1' 로 변경
  bannerAdGroupId: 'ait-ad-test-banner-id',          // TODO: 운영 빌드 시 'ait.v2.live.76083e4ab6404d08' 로 변경
} as const;

export default config;
