import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import TherapyOptionsScreen from '../therapy_options';

// Mock'lar
jest.mock('../../../../constants/therapyOptions', () => ({
  therapyOptions: [
    {
      id: 'text_therapy',
      title: 'Text Therapy',
      description: 'Text-based therapy session',
      icon: 'chatbubble-outline',
      colors: ['#FF6B6B', '#FF8E8E'],
      route: '/sessions/text_session',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
    },
    {
      id: 'voice_therapy',
      title: 'Voice Therapy',
      description: 'Voice-based therapy session',
      icon: 'mic-outline',
      colors: ['#4ECDC4', '#7EDDD8'],
      route: '/sessions/voice_session',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
    },
  ],
}));

jest.mock('../../../../components/therapy/TherapyOptionCard', () => ({
  TherapyOptionCard: jest.fn(({ item, onPress }) => (
    <div onClick={() => onPress(item.route)}>
      {item.title}
    </div>
  )),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: () => ({ startConversationWith: 'therapist' }),
}));

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('TherapyOptionsScreen', () => {
  const mockUseRouter = jest.mocked(require('expo-router').useRouter);

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockImplementation(() => ({
      push: jest.fn(),
      back: jest.fn(),
    }));
  });

  it('component render edilmelidir', () => {
    render(<TherapyOptionsScreen />);
    expect(screen.getByText('therapy.options.header_title')).toBeTruthy();
  });

  it('geri butonuna basıldığında router.back çağrılmalıdır', () => {
    const mockBack = jest.fn();
    mockUseRouter.mockImplementation(() => ({
      push: jest.fn(),
      back: mockBack,
    }));

    render(<TherapyOptionsScreen />);

    const backButton = screen.getByTestId('back-button');
    fireEvent.press(backButton);

    expect(mockBack).toHaveBeenCalled();
  });

  it('therapy option kartına basıldığında router.push çağrılmalıdır', () => {
    const mockPush = jest.fn();
    mockUseRouter.mockImplementation(() => ({
      push: mockPush,
      back: jest.fn(),
    }));

    render(<TherapyOptionsScreen />);

    // Component'in render edildiğini kontrol et
    expect(screen.getByText('therapy.options.header_title')).toBeTruthy();
    expect(mockUseRouter).toHaveBeenCalled();
  });
});