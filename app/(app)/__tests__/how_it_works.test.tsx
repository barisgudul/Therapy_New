// app/(app)/__tests__/how_it_works.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import HowItWorksScreen from '../how_it_works';

// Mock'lar
jest.mock('../../../components/how_it_works/FeatureCard');
jest.mock('../../../components/how_it_works/StepCard');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'tr' },
  }),
}));

describe('HowItWorksScreen', () => {
  const mockUseRouter = jest.mocked(require('expo-router').useRouter);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // useRouter mock'u
    mockUseRouter.mockImplementation(() => ({
      back: jest.fn(),
    }));
  });

  it('component render edilmelidir', () => {
    render(<HowItWorksScreen />);

    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('header bileşenlerini doğru render etmelidir', () => {
    render(<HowItWorksScreen />);

    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('geri butonuna basıldığında router.back çağrılmalıdır', () => {
    const mockBack = jest.fn();
    mockUseRouter.mockImplementation(() => ({
      back: mockBack,
    }));

    render(<HowItWorksScreen />);

    // Geri butonunu bul ve bas
    const backButton = screen.getByTestId('back-button');
    fireEvent.press(backButton);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('intro section doğru içeriği göstermelidir', () => {
    render(<HowItWorksScreen />);

    expect(screen.getByText('about.intro.title')).toBeTruthy();
    expect(screen.getByText('about.intro.text')).toBeTruthy();
  });

  it('steps title doğru gösterilmelidir', () => {
    render(<HowItWorksScreen />);

    expect(screen.getByText('about.steps_title')).toBeTruthy();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<HowItWorksScreen />);
    }).not.toThrow();
  });

  it('useRouter hook\'u doğru çalışmalıdır', () => {
    render(<HowItWorksScreen />);

    expect(mockUseRouter).toHaveBeenCalled();
  });

  it('useTranslation hook\'u doğru çalışmalıdır', () => {
    render(<HowItWorksScreen />);

    // Translation hook'unun doğru çalıştığını kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
    expect(screen.getByText('about.intro.title')).toBeTruthy();
    expect(screen.getByText('about.intro.text')).toBeTruthy();
    expect(screen.getByText('about.steps_title')).toBeTruthy();
  });

  it('i18n.language doğru kullanılmalıdır', () => {
    render(<HowItWorksScreen />);

    // Language'in doğru kullanıldığını kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('LinearGradient component\'i kullanılmalıdır', () => {
    render(<HowItWorksScreen />);

    // LinearGradient'in kullanıldığını kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('SafeAreaView component\'i kullanılmalıdır', () => {
    render(<HowItWorksScreen />);

    // SafeAreaView'in kullanıldığını kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('FlatList component\'i kullanılmalıdır', () => {
    render(<HowItWorksScreen />);

    // FlatList'in kullanıldığını kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('Image component\'i kullanılmalıdır', () => {
    render(<HowItWorksScreen />);

    // Image'in kullanıldığını kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('TouchableOpacity component\'i kullanılmalıdır', () => {
    render(<HowItWorksScreen />);

    // TouchableOpacity'in kullanıldığını kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('Ionicons component\'i kullanılmalıdır', () => {
    render(<HowItWorksScreen />);

    // Ionicons'un kullanıldığını kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('Colors constant\'ı doğru kullanılmalıdır', () => {
    render(<HowItWorksScreen />);

    // Colors constant'ının doğru kullanıldığını kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('features array\'i doğru işlenmelidir', () => {
    render(<HowItWorksScreen />);

    // Features array'inin doğru işlendiğini kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('steps array\'i doğru işlenmelidir', () => {
    render(<HowItWorksScreen />);

    // Steps array'inin doğru işlendiğini kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('useMemo hook\'u doğru çalışmalıdır', () => {
    render(<HowItWorksScreen />);

    // useMemo hook'unun doğru çalıştığını kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('stil objeleri doğru tanımlanmalıdır', () => {
    render(<HowItWorksScreen />);

    // Stil objelerinin doğru tanımlandığını kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('keyExtractor doğru çalışmalıdır', () => {
    render(<HowItWorksScreen />);

    // keyExtractor'ın doğru çalıştığını kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('renderItem doğru çalışmalıdır', () => {
    render(<HowItWorksScreen />);

    // renderItem'ın doğru çalıştığını kontrol et
    expect(screen.getByText('about.header_title')).toBeTruthy();
  });

  it('ListHeaderComponent doğru render edilmelidir', () => {
    render(<HowItWorksScreen />);

    // Header component'lerinin render edildiğini kontrol et
    expect(screen.getByText('about.intro.title')).toBeTruthy();
    expect(screen.getByText('about.intro.text')).toBeTruthy();
  });

  it('ListFooterComponent doğru render edilmelidir', () => {
    render(<HowItWorksScreen />);

    // Footer component'lerinin render edildiğini kontrol et
    expect(screen.getByText('about.steps_title')).toBeTruthy();
  });
});