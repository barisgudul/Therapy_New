// jest.config.js

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-router))',
  ],
  moduleNameMapper: {
    // Bu kural jest-expo preset'inin expo-router'ı yanlış çözümlemesini engeller.
    '^expo-router$': '<rootDir>/test/__mocks__/expo-router.js',
    '^expo-router/': '<rootDir>/test/__mocks__/expo-router.js',
  },
};


