// React Native core must initialize first on bundled Hermes builds.
require('react-native/Libraries/Core/InitializeCore');

// Keep the splash screen up until the app has finished its first render.
const SplashScreen = require('expo-splash-screen') as typeof import('expo-splash-screen');
void SplashScreen.preventAutoHideAsync();

const { registerRootComponent } = require('expo') as typeof import('expo');
const App = require('./App').default as typeof import('./App').default;

registerRootComponent(App);
