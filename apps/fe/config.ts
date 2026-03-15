/**
 * 환경별 설정
 * __DEV__ : Granite/Metro가 자동 주입
 *   - 개발 (granite dev)  → true
 *   - 운영 (npm run build) → false
 */
const config = {
  apiBaseUrl: __DEV__
    ? 'http://localhost:4000'
    : 'http://34.173.234.88:4000',

  adGroupId: __DEV__
    ? 'ait.dev.43daa14da3ae487b'   // 테스트 광고 ID
    : 'ait.prod.REPLACE_ME',        // 운영 광고 ID (앱인토스 콘솔에서 발급)
} as const;

export default config;
