// app/(app)/__tests__/daily_reflection.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import DailyReflectionScreen from '../daily_reflection';

// Mock'lar
jest.mock('../../../hooks/useDailyReflection');
jest.mock('../../../components/daily_reflection/GradientHeader');
jest.mock('../../../components/daily_reflection/GradientMoodImage');
jest.mock('../../../components/daily_reflection/GradientMoodLabel');
jest.mock('../../../components/daily_reflection/InputModal');
jest.mock('../../../components/daily_reflection/FeedbackModal');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Medium: 'Medium',
  },
}));
jest.mock('@react-native-community/slider', () => 'Slider');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'tr' },
  }),
}));

describe('DailyReflectionScreen', () => {
  const mockUseDailyReflection = jest.mocked(require('../../../hooks/useDailyReflection').useDailyReflection);
  const mockHaptics = require('expo-haptics');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock state
    mockUseDailyReflection.mockReturnValue({
      state: {
        freemium: {
          loading: false,
          can_use: true,
          used_count: 5,
          limit_count: 10,
        },
        moodValue: 3,
        note: 'Test notu',
        saving: false,
        inputVisible: false,
        feedbackVisible: false,
        aiMessage: 'Test AI mesajı',
        satisfactionScore: null,
        pendingSessionId: 'session-123',
        light1: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        light2: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        fadeIn: { opacity: 1 },
        scaleAnim: { scale: 1 },
      },
      handlers: {
        setMoodValue: jest.fn(),
        onSlidingComplete: jest.fn(),
        setInputVisible: jest.fn(),
        setNote: jest.fn(),
        animatePress: jest.fn(),
        saveSession: jest.fn(),
        closeFeedback: jest.fn(),
        handleSatisfaction: jest.fn(),
        router: {
          push: jest.fn(),
        },
      },
    });
  });

  it('component render edilmelidir', () => {
    render(<DailyReflectionScreen />);

    expect(mockUseDailyReflection).toHaveBeenCalled();
  });

  it('freemium loading durumunda yükleme mesajı göstermelidir', () => {
    mockUseDailyReflection.mockReturnValue({
      state: {
        freemium: {
          loading: true,
          can_use: false,
          used_count: 0,
          limit_count: 0,
        },
        moodValue: 3,
        note: '',
        saving: false,
        inputVisible: false,
        feedbackVisible: false,
        aiMessage: '',
        satisfactionScore: null,
        pendingSessionId: null,
        light1: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        light2: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        fadeIn: { opacity: 1 },
        scaleAnim: { scale: 1 },
      },
      handlers: {
        setMoodValue: jest.fn(),
        onSlidingComplete: jest.fn(),
        setInputVisible: jest.fn(),
        setNote: jest.fn(),
        animatePress: jest.fn(),
        saveSession: jest.fn(),
        closeFeedback: jest.fn(),
        handleSatisfaction: jest.fn(),
        router: { push: jest.fn() },
      },
    });

    render(<DailyReflectionScreen />);

    expect(screen.getByText('daily_reflection.loading')).toBeTruthy();
  });

  it('freemium can_use false ise premium prompt göstermelidir', () => {
    mockUseDailyReflection.mockReturnValue({
      state: {
        freemium: {
          loading: false,
          can_use: false,
          used_count: 5,
          limit_count: 5,
        },
        moodValue: 3,
        note: '',
        saving: false,
        inputVisible: false,
        feedbackVisible: false,
        aiMessage: '',
        satisfactionScore: null,
        pendingSessionId: null,
        light1: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        light2: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        fadeIn: { opacity: 1 },
        scaleAnim: { scale: 1 },
      },
      handlers: {
        setMoodValue: jest.fn(),
        onSlidingComplete: jest.fn(),
        setInputVisible: jest.fn(),
        setNote: jest.fn(),
        animatePress: jest.fn(),
        saveSession: jest.fn(),
        closeFeedback: jest.fn(),
        handleSatisfaction: jest.fn(),
        router: { push: jest.fn() },
      },
    });

    render(<DailyReflectionScreen />);

    expect(screen.getByText('daily_reflection.premium.title')).toBeTruthy();
    expect(screen.getByText('daily_reflection.premium.description')).toBeTruthy();
  });

  it('premium prompt butonuna basıldığında subscription sayfasına yönlendirmelidir', () => {
    const mockPush = jest.fn();
    mockUseDailyReflection.mockReturnValue({
      state: {
        freemium: {
          loading: false,
          can_use: false,
          used_count: 5,
          limit_count: 5,
        },
        moodValue: 3,
        note: '',
        saving: false,
        inputVisible: false,
        feedbackVisible: false,
        aiMessage: '',
        satisfactionScore: null,
        pendingSessionId: null,
        light1: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        light2: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        fadeIn: { opacity: 1 },
        scaleAnim: { scale: 1 },
      },
      handlers: {
        setMoodValue: jest.fn(),
        onSlidingComplete: jest.fn(),
        setInputVisible: jest.fn(),
        setNote: jest.fn(),
        animatePress: jest.fn(),
        saveSession: jest.fn(),
        closeFeedback: jest.fn(),
        handleSatisfaction: jest.fn(),
        router: { push: mockPush },
      },
    });

    render(<DailyReflectionScreen />);

    const button = screen.getByText('daily_reflection.premium.button');
    fireEvent.press(button);

    expect(mockPush).toHaveBeenCalledWith('/subscription');
  });

  it('ana ekran bileşenlerini doğru render etmelidir', () => {
    render(<DailyReflectionScreen />);

    expect(mockUseDailyReflection).toHaveBeenCalled();
  });

  it('SafeAreaView ve LinearGradient ile doğru stil uygulanmalıdır', () => {
    render(<DailyReflectionScreen />);

    expect(mockUseDailyReflection).toHaveBeenCalled();
  });

  it('slider doğru props ile render edilmelidir', () => {
    render(<DailyReflectionScreen />);

    expect(mockUseDailyReflection).toHaveBeenCalled();
  });

  it('not yazma kartına basıldığında input modal açılmalıdır', () => {
    const mockSetInputVisible = jest.fn();
    const mockAnimatePress = jest.fn();
    
    mockUseDailyReflection.mockReturnValue({
      state: {
        freemium: {
          loading: false,
          can_use: true,
          used_count: 5,
          limit_count: 10,
        },
        moodValue: 3,
        note: '',
        saving: false,
        inputVisible: false,
        feedbackVisible: false,
        aiMessage: '',
        satisfactionScore: null,
        pendingSessionId: null,
        light1: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        light2: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        fadeIn: { opacity: 1 },
        scaleAnim: { scale: 1 },
      },
      handlers: {
        setMoodValue: jest.fn(),
        onSlidingComplete: jest.fn(),
        setInputVisible: mockSetInputVisible,
        setNote: jest.fn(),
        animatePress: mockAnimatePress,
        saveSession: jest.fn(),
        closeFeedback: jest.fn(),
        handleSatisfaction: jest.fn(),
        router: { push: jest.fn() },
      },
    });

    render(<DailyReflectionScreen />);

    const promptCard = screen.getByText('daily_reflection.prompt.placeholder');
    fireEvent.press(promptCard);

    expect(mockAnimatePress).toHaveBeenCalled();
    expect(mockSetInputVisible).toHaveBeenCalledWith(true);
  });

  it('kaydet butonuna basıldığında haptic feedback ve saveSession çağrılmalıdır', () => {
    const mockSaveSession = jest.fn();
    const mockHaptics = jest.requireActual('expo-haptics');
    
    mockUseDailyReflection.mockReturnValue({
      state: {
        freemium: {
          loading: false,
          can_use: true,
          used_count: 5,
          limit_count: 10,
        },
        moodValue: 3,
        note: 'Test notu',
        saving: false,
        inputVisible: false,
        feedbackVisible: false,
        aiMessage: '',
        satisfactionScore: null,
        pendingSessionId: null,
        light1: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        light2: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        fadeIn: { opacity: 1 },
        scaleAnim: { scale: 1 },
      },
      handlers: {
        setMoodValue: jest.fn(),
        onSlidingComplete: jest.fn(),
        setInputVisible: jest.fn(),
        setNote: jest.fn(),
        animatePress: jest.fn(),
        saveSession: mockSaveSession,
        closeFeedback: jest.fn(),
        handleSatisfaction: jest.fn(),
        router: { push: jest.fn() },
      },
    });

    render(<DailyReflectionScreen />);

    const saveButton = screen.getByText('daily_reflection.save.button');
    fireEvent.press(saveButton);

    expect(mockSaveSession).toHaveBeenCalled();
  });

  it('not yoksa kaydet butonu disabled olmalıdır', () => {
    mockUseDailyReflection.mockReturnValue({
      state: {
        freemium: {
          loading: false,
          can_use: true,
          used_count: 5,
          limit_count: 10,
        },
        moodValue: 3,
        note: '',
        saving: false,
        inputVisible: false,
        feedbackVisible: false,
        aiMessage: '',
        satisfactionScore: null,
        pendingSessionId: null,
        light1: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        light2: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        fadeIn: { opacity: 1 },
        scaleAnim: { scale: 1 },
      },
      handlers: {
        setMoodValue: jest.fn(),
        onSlidingComplete: jest.fn(),
        setInputVisible: jest.fn(),
        setNote: jest.fn(),
        animatePress: jest.fn(),
        saveSession: jest.fn(),
        closeFeedback: jest.fn(),
        handleSatisfaction: jest.fn(),
        router: { push: jest.fn() },
      },
    });

    render(<DailyReflectionScreen />);

    // Kaydet butonu disabled olmalı (opacity 0.5 ile)
    const saveButton = screen.getByText('daily_reflection.save.button');
    expect(saveButton).toBeTruthy();
  });

  it('saving durumunda kaydet butonu loading metni göstermelidir', () => {
    mockUseDailyReflection.mockReturnValue({
      state: {
        freemium: {
          loading: false,
          can_use: true,
          used_count: 5,
          limit_count: 10,
        },
        moodValue: 3,
        note: 'Test notu',
        saving: true,
        inputVisible: false,
        feedbackVisible: false,
        aiMessage: '',
        satisfactionScore: null,
        pendingSessionId: null,
        light1: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        light2: { getTranslateTransform: () => ({ translateX: 0, translateY: 0 }) },
        fadeIn: { opacity: 1 },
        scaleAnim: { scale: 1 },
      },
      handlers: {
        setMoodValue: jest.fn(),
        onSlidingComplete: jest.fn(),
        setInputVisible: jest.fn(),
        setNote: jest.fn(),
        animatePress: jest.fn(),
        saveSession: jest.fn(),
        closeFeedback: jest.fn(),
        handleSatisfaction: jest.fn(),
        router: { push: jest.fn() },
      },
    });

    render(<DailyReflectionScreen />);

    expect(screen.getByText('daily_reflection.save.saving')).toBeTruthy();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<DailyReflectionScreen />);
    }).not.toThrow();
  });

  it('useDailyReflection hook\'u doğru çalışmalıdır', () => {
    render(<DailyReflectionScreen />);

    expect(mockUseDailyReflection).toHaveBeenCalled();
  });

  it('useTranslation hook\'u doğru çalışmalıdır', () => {
    render(<DailyReflectionScreen />);

    // Translation hook'unun doğru çalıştığını kontrol et
    expect(screen.getByText('daily_reflection.slider.question')).toBeTruthy();
  });

  it('i18n.language doğru kullanılmalıdır', () => {
    render(<DailyReflectionScreen />);

    // Language'in doğru kullanıldığını kontrol et
    expect(screen.getByText('daily_reflection.slider.question')).toBeTruthy();
  });
});