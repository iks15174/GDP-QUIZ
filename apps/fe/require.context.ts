// Granite 파일 기반 라우팅을 위한 컨텍스트
// 빌드 도구가 자동으로 pages/ 하위 파일을 스캔합니다
export const context = require.context('./pages', true, /\.(tsx|ts|js|jsx)$/);
