// React Native core must initialize first on bundled Hermes builds.
require('react-native/Libraries/Core/InitializeCore');

// Polyfills the Supabase client needs (crypto.getRandomValues + URL). Load early.
require('react-native-get-random-values');
require('react-native-url-polyfill/auto');

// Keep the splash screen up until the app has finished its first render.
const SplashScreen = require('expo-splash-screen') as typeof import('expo-splash-screen');
void SplashScreen.preventAutoHideAsync();

const { registerRootComponent } = require('expo') as typeof import('expo');
const App = require('./App').default as typeof import('./App').default;

registerRootComponent(App);
