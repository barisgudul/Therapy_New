// jest.config.js

module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect', 
    './jest.setup.js'
  ],

  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)/)"
  ],
  
  testMatch: ['<rootDir>/hooks/**/__tests__/**/*.test.{js,jsx,ts,tsx}'],

  // React Native için gerekli ayarlar
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Native modüller için mock'lar
  moduleNameMapper: {
    '^react-native-toast-message$': '<rootDir>/test/__mocks__/toast.js',
    '^expo-linear-gradient$': '<rootDir>/test/__mocks__/empty.js',
    '^@expo/vector-icons$': '<rootDir>/test/__mocks__/empty.js',
    '^react-native$': '<rootDir>/test/__mocks__/react-native.js',
  },
};


