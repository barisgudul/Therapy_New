// jest.setup.js

// Console.log'ları test sırasında sustur
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
  
  // AsyncStorage'ı mock'la
  jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
  );
  
  // expo-localization'ı mock'la
  jest.mock('expo-localization', () => ({
    getLocales: () => [{ languageTag: 'en-US', languageCode: 'en', textDirection: 'ltr', regionCode: 'US' }],
    getCalendars: () => ['gregory'],
  }));
  
  // MOOD_LEVELS'ı mock'la
  jest.mock('./constants/moods', () => ({
    MOOD_LEVELS: [
      { label: 'Çok Kötü', color: '#0D1B2A', shadow: '#02040F' },
      { label: 'Kötü', color: '#1B263B', shadow: '#0D1B2A' },
      { label: 'Üzgün', color: '#415A77', shadow: '#1B263B' },
      { label: 'Nötr', color: '#778DA9', shadow: '#415A77' },
      { label: 'İyi', color: '#3B82F6', shadow: '#778DA9' },
      { label: 'Harika', color: '#60A5FA', shadow: '#3B82F6' },
      { label: 'Mükemmel', color: '#06B6D4', shadow: '#60A5FA' },
    ],
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
      rpc: jest.fn().mockResolvedValue({ error: null }),
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

  // Automatically clear all timers after each test
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Switch back to real timers
  });

  beforeEach(() => {
    jest.useFakeTimers(); // Use fake timers for each test
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });

  // App tests için ek mock'lar
  jest.mock('react-native-error-boundary', () => ({
    ErrorBoundary: ({ children }) => children,
  }));

  jest.mock('expo-blur', () => ({
    BlurView: 'BlurView',
  }));

  jest.mock('@react-native-community/slider', () => 'Slider');

  jest.mock('@miblanchard/react-native-slider', () => 'Slider');

  jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => {};
    return Reanimated;
  });

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  }),
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
}));

// Mock expo-audio
jest.mock('expo-audio', () => ({
  requestRecordingPermissionsAsync: jest.fn(),
  setAudioModeAsync: jest.fn(),
  useAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    unload: jest.fn(),
    playing: false,
    duration: 0,
    currentTime: 0,
  })),
  useRecording: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    recording: false,
    duration: 0,
    uri: null,
  })),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: 'tr',
      changeLanguage: jest.fn(),
    },
  }),
}));

// Mock i18n default export
jest.mock('./utils/i18n', () => ({
  __esModule: true,
  default: {
    t: (key) => key,
    language: 'tr',
    changeLanguage: jest.fn(),
  },
  SUPPORTED_LANGUAGES: ['tr', 'en', 'de'],
  DEFAULT_LANGUAGE: 'en',
  changeLanguage: jest.fn(),
}));

// Mock i18next initReactI18next
jest.mock('i18next', () => ({
  init: jest.fn(),
  use: jest.fn(),
  t: (key) => key,
  language: 'tr',
}));

// Mock utils/i18n
jest.mock('./utils/i18n', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

// Mock expo-router useRouter için mockReturnValue desteği
const mockUseRouter = jest.fn(() => ({
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  canGoBack: jest.fn(() => true),
}));

jest.doMock('expo-router', () => ({
  useRouter: mockUseRouter,
  useLocalSearchParams: jest.fn(() => ({})),
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));
  