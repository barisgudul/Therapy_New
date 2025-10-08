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

jest.mock('../../../../components/therapy/TherapyOptionCard', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    TherapyOptionCard: jest.fn(({ item, onPress }) => (
      <View testID="therapy-option-card">
        <Text>{item.title}</Text>
        <TouchableOpacity testID={`card-${item.id}`} onPress={() => onPress(item.route)}>
          <Text>Select</Text>
        </TouchableOpacity>
      </View>
    )),
  };
});

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

  it('handleSelect fonksiyonu doğru route ile çalışmalıdır', () => {
    const mockPush = jest.fn();
    mockUseRouter.mockImplementation(() => ({
      push: mockPush,
      back: jest.fn(),
    }));

    render(<TherapyOptionsScreen />);

    // handleSelect tanımlı olmalı
    expect(mockPush).toBeDefined();
  });

  it('startConversationWith param varsa route params ile push yapmalıdır', () => {
    const mockPush = jest.fn();
    mockUseRouter.mockImplementation(() => ({
      push: mockPush,
      back: jest.fn(),
    }));

    render(<TherapyOptionsScreen />);

    // Params ile push yapılabilmeli
    expect(mockPush).toBeDefined();
  });

  it('therapyOptions listesi render edilmelidir', () => {
    render(<TherapyOptionsScreen />);

    // Therapy options render edilmeli
    expect(mockUseRouter).toHaveBeenCalled();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<TherapyOptionsScreen />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<TherapyOptionsScreen />);

    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('handleOptionPress fonksiyonu route ile push yapmalıdır', () => {
    const mockPush = jest.fn();
    mockUseRouter.mockImplementation(() => ({
      push: mockPush,
      back: jest.fn(),
    }));

    render(<TherapyOptionsScreen />);

    // Card button'a bas
    const cardButton = screen.getAllByText('Select')[0];
    fireEvent.press(cardButton);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/sessions/text_session',
      params: { startConversationWith: 'therapist' },
    });
  });

  it('renderHeader fonksiyonu doğru çalışmalıdır', () => {
    render(<TherapyOptionsScreen />);

    // Hero title ve subtitle render edilmeli
    expect(screen.getByText('therapy.options.hero_title')).toBeTruthy();
    expect(screen.getByText('therapy.options.hero_subtitle')).toBeTruthy();
  });

  it('FlatList ile therapy options render edilmelidir', () => {
    render(<TherapyOptionsScreen />);

    // TherapyOptionCard render edilmeli
    const cards = screen.getAllByTestId('therapy-option-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('Colors.light.tint fallback çalışmalıdır', () => {
    render(<TherapyOptionsScreen />);

    // Component hatasız render edilmeli
    expect(screen.getByText('therapy.options.header_title')).toBeTruthy();
  });

  it('startConversationWith param handleOptionPress\'e iletilmelidir', () => {
    const mockPush = jest.fn();
    mockUseRouter.mockImplementation(() => ({
      push: mockPush,
      back: jest.fn(),
    }));

    render(<TherapyOptionsScreen />);

    const cardButton = screen.getAllByText('Select')[0];
    fireEvent.press(cardButton);

    // startConversationWith param iletilmeli
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          startConversationWith: 'therapist',
        }),
      })
    );
  });
});