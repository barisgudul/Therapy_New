// jest.config.js

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  testMatch: [
    "**/__tests__/**/*.(test).[jt]s?(x)",
    "!**/__tests__/**/*.(mock).[jt]s?(x)"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/coverage/"
  ],
  transformIgnorePatterns: [
    // GÜNCELLENDİ: .deno klasörünü de hariç tutulanlar listesinden çıkardık (yani işlenmesini sağladık)
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-router|moti|\\.deno))',
  ],
  moduleNameMapper: {
    '^expo-router$': '<rootDir>/test/__mocks__/expo-router.js',
    '^expo-router/': '<rootDir>/test/__mocks__/expo-router.js',
  },
};