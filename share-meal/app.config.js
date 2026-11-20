const appJson = require('./app.json');
const fs = require('node:fs');
const path = require('node:path');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || appJson.expo.extra?.eas?.projectId;
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || process.env.GOOGLE_SERVICES_FILE || './google-services.json';

module.exports = () => {
  const config = appJson.expo;

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...(config.ios?.config || {}),
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      ...config.android,
      ...(fs.existsSync(path.resolve(__dirname, googleServicesFile)) ? { googleServicesFile } : {}),
      config: {
        ...(config.android?.config || {}),
        googleMaps: {
          ...((config.android?.config && config.android.config.googleMaps) || {}),
          apiKey: GOOGLE_MAPS_API_KEY,
        },
      },
    },
    extra: {
      ...(config.extra || {}),
      GOOGLE_MAPS_API_KEY_SET: Boolean(GOOGLE_MAPS_API_KEY),
      ...(EAS_PROJECT_ID ? { eas: { ...(config.extra?.eas || {}), projectId: EAS_PROJECT_ID } } : {}),
    },
  };
};
