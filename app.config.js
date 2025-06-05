import localConfig from './app.config.local.js'; // API key burada tanımlı

export default {
  expo: {
    name: 'Therapy_New',
    slug: 'Therapy_New',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'therapynew',

    extra: {
      ...localConfig.extra, // API key buradan geliyor
    },
  },
};
