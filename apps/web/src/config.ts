const config = {
  apiBaseUrl: import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://34-173-234-88.nip.io',

  adGroupId: 'ait.v2.live.b97a91f57cc148e1',
} as const;

export default config;
