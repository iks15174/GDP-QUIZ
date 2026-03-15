import { AppRegistry } from 'react-native';
import App from './_app';

// Granite 샌드박스 v2.0.1은 AppRegistry.runApplication('shared')만 호출함.
// 실제 앱 컴포넌트를 'shared'로도 등록해서 앱이 렌더링되도록 함.
if (!AppRegistry.getAppKeys().includes('shared')) {
  AppRegistry.registerComponent('shared', () => App);
}
