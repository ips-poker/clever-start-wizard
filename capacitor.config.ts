import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a391e581510e4cfc905a60ff6b51b1e6',
  appName: 'epc-poker',
  webDir: 'dist',
  server: {
    url: 'https://epc-poker.ru/telegram',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0f172a",
      showSpinner: false,
      androidSpinnerStyle: "small",
      iosSpinnerStyle: "small"
    },
    App: {
      launchUrl: "https://epc-poker.ru/telegram"
    }
  }
};

export default config;