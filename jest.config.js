// jest.config.js
module.exports = {
  preset: 'react-native',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect', '<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)/)'
  ],
  testMatch: ['<rootDir>/hooks/**/__tests__/**/*.(test|spec).{js,jsx,ts,tsx}'],
  moduleNameMapper: {
    '^react-native-toast-message$': '<rootDir>/test/__mocks__/toast.js',
    '^expo-linear-gradient$': '<rootDir>/test/__mocks__/empty.js',
    '^@expo/vector-icons$': '<rootDir>/test/__mocks__/empty.js',
  },
};


