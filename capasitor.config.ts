import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.threedviewer.app',
  appName: '3D Model Viewer',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    buildOptions: {
      keystorePath: 'release.keystore',
      keystorePassword: process.env.KEYSTORE_PASSWORD,
      keystoreAlias: '3d-viewer',
      keystoreAliasPassword: process.env.KEYSTORE_ALIAS_PASSWORD
    }
  }
};

export default config;
