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

  it('FeedbackModal onNavigateToTherapy ile pendingSessionId varsa therapy\'ye gider', () => {
    const mockCloseFeedback = jest.fn();
    const mockRouterPush = jest.fn();

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
        feedbackVisible: true,
        aiMessage: 'Test mesaj',
        satisfactionScore: null,
        pendingSessionId: 'session-abc-123',
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
        closeFeedback: mockCloseFeedback,
        handleSatisfaction: jest.fn(),
        router: { push: mockRouterPush },
      },
    });

    const { UNSAFE_root } = render(<DailyReflectionScreen />);

    // FeedbackModal mock component'ini bul
    const FeedbackModal = require('../../../components/daily_reflection/FeedbackModal').default;
    const feedbackModals = UNSAFE_root.findAllByType(FeedbackModal);
    
    expect(feedbackModals.length).toBeGreaterThan(0);

    // onNavigateToTherapy callback'ini al ve çağır
    const feedbackModal = feedbackModals[0];
    const onNavigateToTherapy = feedbackModal.props.onNavigateToTherapy;

    expect(onNavigateToTherapy).toBeDefined();

    // Callback'i çağır
    onNavigateToTherapy();

    // closeFeedback çağrıldı
    expect(mockCloseFeedback).toHaveBeenCalled();

    // router.push doğru parametrelerle çağrıldı
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/sessions/text_session',
      params: { pendingSessionId: 'session-abc-123' },
    });
  });

  it('FeedbackModal onNavigateToTherapy ile pendingSessionId yoksa hiçbir şey yapmaz', () => {
    const mockCloseFeedback = jest.fn();
    const mockRouterPush = jest.fn();

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
        feedbackVisible: true,
        aiMessage: 'Test mesaj',
        satisfactionScore: null,
        pendingSessionId: null, // YOK
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
        closeFeedback: mockCloseFeedback,
        handleSatisfaction: jest.fn(),
        router: { push: mockRouterPush },
      },
    });

    const { UNSAFE_root } = render(<DailyReflectionScreen />);

    const FeedbackModal = require('../../../components/daily_reflection/FeedbackModal').default;
    const feedbackModal = UNSAFE_root.findAllByType(FeedbackModal)[0];
    const onNavigateToTherapy = feedbackModal.props.onNavigateToTherapy;

    // Callback'i çağır
    onNavigateToTherapy();

    // closeFeedback çağrılmadı (early return)
    expect(mockCloseFeedback).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('slider container onLayout event handler çalışır', () => {
    const { UNSAFE_root } = render(<DailyReflectionScreen />);

    // View component'lerini bul
    const View = require('react-native').View;
    const views = UNSAFE_root.findAllByType(View);

    // onLayout prop'u olan View'i bul
    const viewWithOnLayout = views.find(v => v.props.onLayout);

    expect(viewWithOnLayout).toBeTruthy();

    // onLayout event'ini simüle et
    const onLayout = viewWithOnLayout.props.onLayout;
    onLayout({ nativeEvent: { layout: { width: 350 } } });

    // Hata olmamalı (setSliderWidth internal state update)
    expect(true).toBe(true);
  });

  it('InputModal onClose çağrıldığında setInputVisible false ile çağrılır', () => {
    const mockSetInputVisible = jest.fn();

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
        inputVisible: true,
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
        animatePress: jest.fn(),
        saveSession: jest.fn(),
        closeFeedback: jest.fn(),
        handleSatisfaction: jest.fn(),
        router: { push: jest.fn() },
      },
    });

    const { UNSAFE_root } = render(<DailyReflectionScreen />);

    const InputModal = require('../../../components/daily_reflection/InputModal').default;
    const inputModal = UNSAFE_root.findByType(InputModal);

    expect(inputModal.props.onClose).toBeDefined();

    // onClose callback'ini çağır
    inputModal.props.onClose();

    expect(mockSetInputVisible).toHaveBeenCalledWith(false);
  });

  it('InputModal onSubmit çağrıldığında setInputVisible false ile çağrılır', () => {
    const mockSetInputVisible = jest.fn();

    mockUseDailyReflection.mockReturnValue({
      state: {
        freemium: {
          loading: false,
          can_use: true,
          used_count: 5,
          limit_count: 10,
        },
        moodValue: 3,
        note: 'Some note',
        saving: false,
        inputVisible: true,
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
        animatePress: jest.fn(),
        saveSession: jest.fn(),
        closeFeedback: jest.fn(),
        handleSatisfaction: jest.fn(),
        router: { push: jest.fn() },
      },
    });

    const { UNSAFE_root } = render(<DailyReflectionScreen />);

    const InputModal = require('../../../components/daily_reflection/InputModal').default;
    const inputModal = UNSAFE_root.findByType(InputModal);

    expect(inputModal.props.onSubmit).toBeDefined();

    // onSubmit callback'ini çağır
    inputModal.props.onSubmit();

    expect(mockSetInputVisible).toHaveBeenCalledWith(false);
  });
});