// components/__tests__/dream/Oracle.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import Oracle from '../../dream/Oracle';
import { generateSilentOracle } from '../../../services/prompt.service';
import * as Haptics from 'expo-haptics';

// Mock dependencies
jest.mock('../../../services/prompt.service', () => ({
  generateSilentOracle: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
}));

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.useSharedValue = jest.fn((initial) => ({ value: initial }));
  Reanimated.withTiming = jest.fn((value) => value);
  return Reanimated;
});

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'tr' }
  }),
}));

describe('Oracle', () => {
  const mockProps = {
    dreamTheme: 'Test Dream Theme',
    pastLink: 'Test Past Link',
    blindSpot: 'Test Blind Spot',
    goldenThread: 'Test Golden Thread',
    onSaveResult: jest.fn(),
  };

  const mockOracleData = {
    f1: 'Test insight 1',
    f2: 'Test insight 2', 
    f3: 'Test action insight'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('başlangıçta idle durumunda render edilmelidir', () => {
    render(<Oracle {...mockProps} />);
    
    expect(screen.getByTestId('oracle-container')).toBeTruthy();
    expect(screen.getByText('dream.components.oracle.title')).toBeTruthy();
    expect(screen.getByText('dream.components.oracle.subtitle')).toBeTruthy();
    expect(screen.getByText('dream.components.oracle.explore')).toBeTruthy();
  });

  it('initialData verildiğinde success state ile başlamalıdır', () => {
    render(<Oracle {...mockProps} initialData={mockOracleData} />);
    
    expect(screen.getByTestId('oracle-container')).toBeTruthy();
    expect(screen.getByText('dream.components.oracle.title')).toBeTruthy();
  });

  it('explore butonuna basıldığında loading state göstermelidir', async () => {
    (generateSilentOracle as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<Oracle {...mockProps} />);
    
    const exploreButton = screen.getByText('dream.components.oracle.explore');
    fireEvent.press(exploreButton);
    
    await waitFor(() => {
      expect(screen.getByText('dream.components.oracle.loading')).toBeTruthy();
    });
    
    expect(Haptics.impactAsync).toHaveBeenCalledWith('Medium');
  });

  it('başarılı oracle fetch sonrası success state göstermelidir', async () => {
    (generateSilentOracle as jest.Mock).mockResolvedValue(mockOracleData);
    
    render(<Oracle {...mockProps} />);
    
    const exploreButton = screen.getByText('dream.components.oracle.explore');
    fireEvent.press(exploreButton);
    
    await waitFor(() => {
      expect(mockProps.onSaveResult).toHaveBeenCalledWith(mockOracleData);
    });
  });

  it('oracle fetch hatası durumunda error state göstermelidir', async () => {
    (generateSilentOracle as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<Oracle {...mockProps} />);
    
    const exploreButton = screen.getByText('dream.components.oracle.explore');
    fireEvent.press(exploreButton);
    
    await waitFor(() => {
      expect(screen.getByText('dream.components.oracle.error_generic')).toBeTruthy();
    });
  });

  it('retry butonuna basıldığında tekrar fetch yapmalıdır', async () => {
    (generateSilentOracle as jest.Mock)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockOracleData);
    
    render(<Oracle {...mockProps} />);
    
    // İlk fetch - hata
    const exploreButton = screen.getByText('dream.components.oracle.explore');
    fireEvent.press(exploreButton);
    
    await waitFor(() => {
      expect(screen.getByText('dream.components.oracle.error_generic')).toBeTruthy();
    });
    
    // Retry
    const retryButton = screen.getByText('dream.components.oracle.retry');
    fireEvent.press(retryButton);
    
    await waitFor(() => {
      expect(mockProps.onSaveResult).toHaveBeenCalledWith(mockOracleData);
    });
  });

  it('props\'ları doğru şekilde almalıdır', () => {
    const { toJSON } = render(<Oracle {...mockProps} />);
    expect(toJSON()).toBeTruthy();
  });

  it('component doğru şekilde render edilmelidir', () => {
    const { toJSON } = render(<Oracle {...mockProps} />);
    expect(toJSON()).toBeTruthy();
  });

  it('farklı props değerleri ile çalışmalıdır', () => {
    const differentProps = {
      dreamTheme: 'Farklı Tema',
      pastLink: 'Farklı Geçmiş',
      blindSpot: 'Farklı Kör Nokta',
      goldenThread: 'Farklı Altın İplik',
      onSaveResult: jest.fn(),
    };

    const { toJSON } = render(<Oracle {...differentProps} />);
    expect(toJSON()).toBeTruthy();
  });
});
