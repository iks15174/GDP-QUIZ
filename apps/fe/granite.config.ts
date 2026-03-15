import { appsInToss } from '@apps-in-toss/framework/plugins';
import { defineConfig } from '@granite-js/react-native/config';
import path from 'path';

const monorepoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  appName: 'gdp-economy-quiz',
  scheme: 'intoss',
  entryFile: './_app.tsx',
  metro: {
    watchFolders: [monorepoRoot],
    resolver: {
      nodeModulesPaths: [
        path.resolve(__dirname, 'node_modules'),
        path.resolve(monorepoRoot, 'node_modules'),
      ],
    },
  },
  plugins: [
    appsInToss({
      brand: {
        displayName: 'GDP 경제 퀴즈',
        primaryColor: '#3182F6',
        icon: '',
      },
      permissions: [],
    }),
  ],
});
