// jest.config.js

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  // Jest'e sadece .test.ts/.test.tsx dosyalarını test olarak görmesini söyle
  // .mock.ts dosyalarını test olarak görmesin
  testMatch: [
    "**/__tests__/**/*.(test).[jt]s?(x)", 
    "!**/__tests__/**/*.(mock).[jt]s?(x)"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/coverage/"
  ],
   transformIgnorePatterns: [
     'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-router|moti))',
   ],
  moduleNameMapper: {
    // Bu kural jest-expo preset'inin expo-router'ı yanlış çözümlemesini engeller.
    '^expo-router$': '<rootDir>/test/__mocks__/expo-router.js',
    '^expo-router/': '<rootDir>/test/__mocks__/expo-router.js',
  },
};
