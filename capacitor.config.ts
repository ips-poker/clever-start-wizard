import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a391e581510e4cfc905a60ff6b51b1e6',
  appName: 'epc-poker',
  webDir: 'dist',
  server: {
    url: 'https://a391e581-510e-4cfc-905a-60ff6b51b1e6.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0f172a",
      showSpinner: false,
      androidSpinnerStyle: "small",
      iosSpinnerStyle: "small"
    }
  }
};

export default config;