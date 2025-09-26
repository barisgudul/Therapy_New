// jest.setup.js

// React Native için temel mock'lar JEST-EXPO tarafından hallediliyor.
// Bu bloğu çakışmayı önlemek için kaldırıyoruz.
/*
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  return {
    ...RN,
    // Native modülleri taklit et
    NativeModules: {
      ...RN.NativeModules,
      DevMenu: {
        show: jest.fn(),
        reload: jest.fn(),
      },
      Clipboard: {
        setString: jest.fn(),
        getString: jest.fn().mockResolvedValue(''),
      },
    },
    
    // BackHandler mock'u
    BackHandler: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
    
    // LayoutAnimation mock'u
    LayoutAnimation: {
      configureNext: jest.fn(),
      create: jest.fn(),
      easeInEaseOut: jest.fn(),
      linear: jest.fn(),
      spring: jest.fn(),
    },
  };
});
*/

// Reanimated için mock'lar
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.useSharedValue = jest.fn;
  Reanimated.useAnimatedStyle = jest.fn;
  Reanimated.withTiming = jest.fn;
  Reanimated.withSpring = jest.fn;
  return Reanimated;
});

// React Query için olan ayar
try {
  const { notifyManager } = require('@tanstack/query-core');
  const { act } = require('@testing-library/react-native');
  if (notifyManager && typeof notifyManager.setBatchNotifyFunction === 'function') {
    notifyManager.setBatchNotifyFunction((cb) => act(cb));
  }
} catch (_) {
  // Hata durumunda yoksay
}


