const appJson = require('./app.json');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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
    },
  };
};
