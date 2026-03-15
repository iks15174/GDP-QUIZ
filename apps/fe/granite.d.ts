// Granite 라우트 경로 타입 등록
declare module '@granite-js/react-native' {
  interface RegisterScreenInput {
    '/': undefined;
    '/result': { answer: import('./services/api').AnswerResponse };
    '/encyclopedia': undefined;
  }
}

// Metro require.context 타입 선언
declare function require(path: string): any;
declare namespace require {
  function context(
    directory: string,
    useSubdirectories?: boolean,
    regExp?: RegExp
  ): any;
}
