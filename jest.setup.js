// jest.setup.js

// AsyncStorage'ı mock'la
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// expo-localization'ı mock'la
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US', languageCode: 'en', textDirection: 'ltr', regionCode: 'US' }],
  getCalendars: () => ['gregory'],
}));

// jest-expo'nun temel kurulumunu dahil et
import 'jest-expo/src/preset/setup';

// Global Supabase mock'u
jest.mock('./utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user-id' } }, 
        error: null 
      }),
    },
    functions: {
      invoke: jest.fn().mockResolvedValue({
        data: {
          aiResponse: 'Mock AI response',
          usedMemory: null
        },
        error: null
      }),
    },
    from: jest.fn(() => ({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data: { created_at: new Date().toISOString() } }),
          gte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'session-end-123' } }),
              })),
            })),
          })),
        })),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: { id: 'new-event-123' }, error: null }),
        })),
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    })),
  },
}));

// React Native BackHandler'ı mock'la
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  // BackHandler'ı mock'la
  RN.BackHandler = {
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    removeEventListener: jest.fn(),
  };

  return RN;
});

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


