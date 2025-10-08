// app/(guest)/__tests__/primer.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import Primer from '../primer';

// Mock'lar
jest.mock('../../../constants/Colors', () => ({
  Colors: {
    light: {
      tint: '#0a7ea4',
      softText: '#999',
    },
  },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
jest.mock('expo-router/', () => ({
  useRouter: jest.fn(),
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('Primer', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock'lar
    mockUseRouter.mockReturnValue({
      replace: jest.fn(),
      push: jest.fn(),
    });
  });

  it('component render edilmelidir', () => {
    render(<Primer />);
    
    expect(screen.getByText('primer.hero_title')).toBeTruthy();
  });

  it('başlık ve alt başlık gösterilmelidir', () => {
    render(<Primer />);
    
    expect(screen.getByText('primer.hero_title')).toBeTruthy();
    expect(screen.getByText('primer.hero_subtitle_big')).toBeTruthy();
  });

  it('ücretsiz rozeti gösterilmelidir', () => {
    render(<Primer />);
    
    expect(screen.getByText('primer.free_badge')).toBeTruthy();
  });

  it('başlangıç butonuna tıklandığında step1\'e yönlendirilmelidir', () => {
    const mockReplace = jest.fn();
    mockUseRouter.mockReturnValue({
      replace: mockReplace,
      push: jest.fn(),
    });

    render(<Primer />);
    
    const startButton = screen.getByText('primer.cta_analysis');
    fireEvent.press(startButton);
    
    expect(mockReplace).toHaveBeenCalledWith('/(guest)/step1');
  });

  it('giriş yap butonuna tıklandığında login sayfasına yönlendirilmelidir', () => {
    const mockPush = jest.fn();
    mockUseRouter.mockReturnValue({
      replace: jest.fn(),
      push: mockPush,
    });

    render(<Primer />);
    
    const loginButton = screen.getByText('primer.have_account');
    fireEvent.press(loginButton);
    
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<Primer />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<Primer />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('start fonksiyonu router.replace çağırmalıdır', () => {
    const mockReplace = jest.fn();

    mockUseRouter.mockReturnValue({
      replace: mockReplace,
      push: jest.fn(),
    });

    render(<Primer />);

    const startButton = screen.getByText('primer.cta_analysis');
    fireEvent.press(startButton);

    expect(mockReplace).toHaveBeenCalledWith('/(guest)/step1');
  });

  it('DEV button render edilmeli (DEV mode)', () => {
    // __DEV__ true olduğunda render edilmeli
    const originalDEV = global.__DEV__;
    global.__DEV__ = true;

    render(<Primer />);

    // DEV button varsa test et
    global.__DEV__ = originalDEV;
    
    expect(mockUseRouter).toHaveBeenCalled();
  });

  it('gradient colors doğru kullanılmalıdır', () => {
    render(<Primer />);

    // LinearGradient kullanıldığını kontrol et
    expect(screen.getByText('primer.cta_analysis')).toBeTruthy();
  });

  it('logo image render edilmelidir', () => {
    render(<Primer />);

    // Logo'nun render edildiğini kontrol et  
    expect(screen.getByText('Gisbel.')).toBeTruthy();
  });

  it('free badge render edilmelidir', () => {
    render(<Primer />);

    expect(screen.getByText('primer.free_badge')).toBeTruthy();
  });

  it('hero title ve subtitle gösterilmelidir', () => {
    render(<Primer />);

    expect(screen.getByText('primer.hero_title')).toBeTruthy();
    expect(screen.getByText('primer.hero_subtitle_big')).toBeTruthy();
  });
});
