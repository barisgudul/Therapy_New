// app/(guest)/__tests__/softwall.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import SoftWall from '../softwall';

// Mock'lar
jest.mock('../../../constants/Colors', () => ({
  Colors: {
    light: {
      tint: '#0a7ea4',
    },
  },
}));
jest.mock('../../../services/api.service', () => ({
  logEvent: jest.fn().mockResolvedValue(undefined),
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
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('SoftWall', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockLogEvent = jest.mocked(require('../../../services/api.service').logEvent);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock'lar
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
    });
  });

  it('component render edilmelidir', () => {
    render(<SoftWall />);
    
    expect(screen.getByText('softwall.title')).toBeTruthy();
  });

  it('başlık ve alt başlık gösterilmelidir', () => {
    render(<SoftWall />);
    
    expect(screen.getByText('softwall.title')).toBeTruthy();
    expect(screen.getByText('softwall.subtitle')).toBeTruthy();
  });

  it('özellikler başlığı gösterilmelidir', () => {
    render(<SoftWall />);
    
    expect(screen.getByText('softwall.features_title')).toBeTruthy();
  });

  it('3 özellik kartı gösterilmelidir', () => {
    render(<SoftWall />);
    
    expect(screen.getByText('softwall.feature_pattern_title')).toBeTruthy();
    expect(screen.getByText('softwall.feature_potential_title')).toBeTruthy();
    expect(screen.getByText('softwall.feature_step_title')).toBeTruthy();
  });

  it('kayıt ol butonuna tıklandığında event loglanmalıdır', async () => {
    render(<SoftWall />);
    
    const registerButton = screen.getByText('softwall.cta_register');
    fireEvent.press(registerButton);

    expect(mockLogEvent).toHaveBeenCalledWith({
      type: 'register_click',
      data: { source: 'softwall' },
    });
  });

  it('kayıt ol butonuna tıklandığında register sayfasına yönlendirilmelidir', () => {
    const mockPush = jest.fn();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    });

    render(<SoftWall />);
    
    const registerButton = screen.getByText('softwall.cta_register');
    fireEvent.press(registerButton);
    
    expect(mockPush).toHaveBeenCalledWith('/register');
  });

  it('giriş yap butonuna tıklandığında login sayfasına yönlendirilmelidir', () => {
    const mockPush = jest.fn();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    });

    render(<SoftWall />);
    
    const loginButton = screen.getByText('softwall.login_link');
    fireEvent.press(loginButton);
    
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<SoftWall />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<SoftWall />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('FeatureItem component render edilmelidir', () => {
    render(<SoftWall />);

    // Feature items render edilmeli
    expect(screen.getByText('softwall.feature_pattern_title')).toBeTruthy();
    expect(screen.getByText('softwall.feature_potential_title')).toBeTruthy();
    expect(screen.getByText('softwall.feature_step_title')).toBeTruthy();
  });

  it('FeatureItem descriptions render edilmelidir', () => {
    render(<SoftWall />);

    expect(screen.getByText('softwall.feature_pattern_desc')).toBeTruthy();
    expect(screen.getByText('softwall.feature_potential_desc')).toBeTruthy();
    expect(screen.getByText('softwall.feature_step_desc')).toBeTruthy();
  });

  it('handleRegister fonksiyonu çağrılmalıdır', () => {
    const mockPush = jest.fn();

    mockUseRouter.mockReturnValue({
      push: mockPush,
    });

    render(<SoftWall />);

    const registerButton = screen.getByText('softwall.cta_register');
    fireEvent.press(registerButton);

    // Register button çalışmalı
    expect(mockPush).toHaveBeenCalledWith('/register');
  });

  it('features list gösterilmelidir', () => {
    render(<SoftWall />);

    expect(screen.getByText('softwall.features_title')).toBeTruthy();
  });
});
