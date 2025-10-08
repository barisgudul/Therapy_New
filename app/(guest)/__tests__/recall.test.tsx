// app/(guest)/__tests__/recall.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import Recall from '../recall';

// Mock'lar
jest.mock('../../../constants/Colors', () => ({
  Colors: {
    light: {
      tint: '#0a7ea4',
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
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('Recall', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock'lar
    mockUseRouter.mockReturnValue({
      replace: jest.fn(),
    });
  });

  it('component render edilmelidir', () => {
    render(<Recall />);
    
    expect(screen.getByText('recall.title')).toBeTruthy();
  });

  it('başlık ve alt başlık gösterilmelidir', () => {
    render(<Recall />);
    
    expect(screen.getByText('recall.title')).toBeTruthy();
    expect(screen.getByText('recall.subtitle')).toBeTruthy();
  });

  it('motivasyon mesajı gösterilmelidir', () => {
    render(<Recall />);
    
    expect(screen.getByText('recall.motivation_text')).toBeTruthy();
  });

  it('devam et butonuna tıklandığında softwall\'a yönlendirilmelidir', () => {
    const mockReplace = jest.fn();
    mockUseRouter.mockReturnValue({
      replace: mockReplace,
    });

    render(<Recall />);
    
    const continueButton = screen.getByText('recall.cta');
    fireEvent.press(continueButton);
    
    expect(mockReplace).toHaveBeenCalledWith('/(guest)/softwall');
  });

  it('yeniden başlat butonuna tıklandığında step1\'e yönlendirilmelidir', () => {
    const mockReplace = jest.fn();
    mockUseRouter.mockReturnValue({
      replace: mockReplace,
    });

    render(<Recall />);
    
    const restartButton = screen.getByText('recall.restart');
    fireEvent.press(restartButton);
    
    expect(mockReplace).toHaveBeenCalledWith('/(guest)/step1');
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<Recall />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<Recall />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
