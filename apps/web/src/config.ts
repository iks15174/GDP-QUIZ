const config = {
  apiBaseUrl: import.meta.env.DEV ? 'http://localhost:4000' : 'https://34-173-234-88.nip.io',
  adGroupId: 'ait.v2.live.b97a91f57cc148e1',
  bannerAdGroupId: 'ait.v2.live.76083e4ab6404d08',
} as const;

export default config;
