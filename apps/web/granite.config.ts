import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'gdp-economy-quiz',
  brand: {
    displayName: 'GDP 경제 퀴즈',
    primaryColor: '#3182F6',
    icon: 'https://static.toss.im/appsintoss/5523/bc3b273f-ab7d-41c3-86ef-9075a9f7a0c4.png',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'npm run vite:dev',
      build: 'npm run vite:build',
    },
  },
  permissions: [],
});
