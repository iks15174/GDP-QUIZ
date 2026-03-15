const config = {
  apiBaseUrl: import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://34-173-234-88.nip.io',

  adGroupId: 'ait.dev.43daa14da3ae487b', // TODO: 운영 광고 ID 발급 후 교체
} as const;

export default config;
