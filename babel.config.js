// babel.config.js (Expo önerilen yapılandırma)
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};


