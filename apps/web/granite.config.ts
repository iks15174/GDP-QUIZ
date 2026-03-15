import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'gdp-economy-quiz',
  brand: {
    displayName: 'GDP 경제 퀴즈',
    primaryColor: '#3182F6',
    icon: '',
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
