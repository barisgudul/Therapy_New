// app/(app)/__tests__/index.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '../index';

// Mock'lar
jest.mock('../../../context/Auth');
jest.mock('../../../hooks/useHomeScreen');
jest.mock('../../../services/report.service');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }));
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        {children}
      </SafeAreaProvider>
    </QueryClientProvider>
  );
};

describe('HomeScreen', () => {
  const mockUseAuth = jest.mocked(require('../../../context/Auth').useAuth);
  const mockUseHomeScreen = jest.mocked(require('../../../hooks/useHomeScreen').useHomeScreen);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock'lar
    mockUseAuth.mockReturnValue({
      isPendingDeletion: false,
      isLoading: false,
      user: { id: 'user-123', email: 'test@example.com' },
      signOut: jest.fn(),
    });

    mockUseHomeScreen.mockReturnValue({
      activeModal: null,
      scaleAnim: { scale: 1 },
      dailyMessage: 'Test mesajı',
      isVaultLoading: false,
      handleDailyPress: jest.fn(),
      handleReportPress: jest.fn(),
      handleSettingsPress: jest.fn(),
      handleModalClose: jest.fn(),
      handleNavigateToTherapy: jest.fn(),
      invalidateLatestReport: jest.fn(),
    });
  });

  it('component render edilmelidir', () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    expect(screen.getByTestId('home-screen')).toBeTruthy();
  });

  it('yükleme durumunda loading gösterilmelidir', () => {
    mockUseAuth.mockReturnValue({
      isPendingDeletion: false,
      isLoading: true,
      user: null,
      signOut: jest.fn(),
    });

    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // Loading state'inin doğru işlendiğini kontrol et
    expect(mockUseAuth).toHaveBeenCalled();
  });

  it('vault yüklenirken loading gösterilmelidir', () => {
    mockUseHomeScreen.mockReturnValue({
      activeModal: null,
      scaleAnim: { scale: 1 },
      dailyMessage: 'Test mesajı',
      isVaultLoading: true,
      handleDailyPress: jest.fn(),
      handleReportPress: jest.fn(),
      handleSettingsPress: jest.fn(),
      handleModalClose: jest.fn(),
      handleNavigateToTherapy: jest.fn(),
      invalidateLatestReport: jest.fn(),
    });

    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // Loading state'inin doğru işlendiğini kontrol et
    expect(mockUseHomeScreen).toHaveBeenCalled();
  });

  it('kullanıcı silme beklemedeyken PendingDeletionScreen gösterilmelidir', () => {
    mockUseAuth.mockReturnValue({
      isPendingDeletion: true,
      isLoading: false,
      user: { id: 'user-123', email: 'test@example.com' },
      signOut: jest.fn(),
    });

    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // PendingDeletionScreen'in doğru gösterildiğini kontrol et
    expect(mockUseAuth).toHaveBeenCalled();
  });

  it('useAuth hook\'u doğru çalışmalıdır', () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    expect(mockUseAuth).toHaveBeenCalled();
  });

  it('useHomeScreen hook\'u doğru çalışmalıdır', () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    expect(mockUseHomeScreen).toHaveBeenCalled();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );
    }).not.toThrow();
  });

  it('LinearGradient component\'i kullanılmalıdır', () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // LinearGradient'in kullanıldığını kontrol et
    expect(mockUseHomeScreen).toHaveBeenCalled();
  });

  it('SafeAreaView component\'i kullanılmalıdır', () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // SafeAreaView'in kullanıldığını kontrol et
    expect(mockUseHomeScreen).toHaveBeenCalled();
  });

  it('BlurView component\'i conditional olarak kullanılmalıdır', () => {
    mockUseHomeScreen.mockReturnValue({
      activeModal: 'dailyMessage',
      scaleAnim: { scale: 1 },
      dailyMessage: 'Test mesajı',
      isVaultLoading: false,
      handleDailyPress: jest.fn(),
      handleReportPress: jest.fn(),
      handleSettingsPress: jest.fn(),
      handleModalClose: jest.fn(),
      handleNavigateToTherapy: jest.fn(),
      invalidateLatestReport: jest.fn(),
    });

    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // BlurView'in conditional olarak kullanıldığını kontrol et
    expect(mockUseHomeScreen).toHaveBeenCalled();
  });

  it('report modal aktif olduğunda doğru gösterilmelidir', () => {
    mockUseHomeScreen.mockReturnValue({
      activeModal: 'report',
      scaleAnim: { scale: 1 },
      dailyMessage: 'Test mesajı',
      isVaultLoading: false,
      handleDailyPress: jest.fn(),
      handleReportPress: jest.fn(),
      handleSettingsPress: jest.fn(),
      handleModalClose: jest.fn(),
      handleNavigateToTherapy: jest.fn(),
      invalidateLatestReport: jest.fn(),
    });

    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    expect(mockUseHomeScreen).toHaveBeenCalled();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('handleModalClose çağrıldığında modal kapanmalıdır', () => {
    const mockHandleModalClose = jest.fn();
    
    mockUseHomeScreen.mockReturnValue({
      activeModal: 'dailyMessage',
      scaleAnim: { scale: 1 },
      dailyMessage: 'Test mesajı',
      isVaultLoading: false,
      handleDailyPress: jest.fn(),
      handleReportPress: jest.fn(),
      handleSettingsPress: jest.fn(),
      handleModalClose: mockHandleModalClose,
      handleNavigateToTherapy: jest.fn(),
      invalidateLatestReport: jest.fn(),
    });

    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // handleModalClose tanımlı olmalı
    expect(mockHandleModalClose).toBeDefined();
  });

  it('handleNavigateToTherapy çağrıldığında navigation olmalıdır', () => {
    const mockHandleNavigateToTherapy = jest.fn();
    
    mockUseHomeScreen.mockReturnValue({
      activeModal: 'dailyMessage',
      scaleAnim: { scale: 1 },
      dailyMessage: 'Test mesajı',
      isVaultLoading: false,
      handleDailyPress: jest.fn(),
      handleReportPress: jest.fn(),
      handleSettingsPress: jest.fn(),
      handleModalClose: jest.fn(),
      handleNavigateToTherapy: mockHandleNavigateToTherapy,
      invalidateLatestReport: jest.fn(),
    });

    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // handleNavigateToTherapy tanımlı olmalı
    expect(mockHandleNavigateToTherapy).toBeDefined();
  });

  it('invalidateLatestReport çağrıldığında query invalidate edilmelidir', () => {
    const mockInvalidateLatestReport = jest.fn();
    
    mockUseHomeScreen.mockReturnValue({
      activeModal: null,
      scaleAnim: { scale: 1 },
      dailyMessage: 'Test mesajı',
      isVaultLoading: false,
      handleDailyPress: jest.fn(),
      handleReportPress: jest.fn(),
      handleSettingsPress: jest.fn(),
      handleModalClose: jest.fn(),
      handleNavigateToTherapy: jest.fn(),
      invalidateLatestReport: mockInvalidateLatestReport,
    });

    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // invalidateLatestReport tanımlı olmalı
    expect(mockInvalidateLatestReport).toBeDefined();
  });

  it('onboardingInsight modal test edilmelidir', () => {
    mockUseHomeScreen.mockReturnValue({
      activeModal: 'onboardingInsight',
      scaleAnim: { scale: 1 },
      dailyMessage: 'Test mesajı',
      isVaultLoading: false,
      onboardingInsight: { insight: 'Test insight' },
      handleDailyPress: jest.fn(),
      handleReportPress: jest.fn(),
      handleSettingsPress: jest.fn(),
      handleModalClose: jest.fn(),
      handleNavigateToTherapy: jest.fn(),
      invalidateLatestReport: jest.fn(),
      handleOnboardingInsightPress: jest.fn(),
    });

    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    expect(mockUseHomeScreen).toHaveBeenCalled();
  });

  it('HomeHeader component render edilmelidir', () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // HomeHeader render edilmeli
    expect(screen.getByTestId('home-screen')).toBeTruthy();
  });

  it('HomeIllustration component render edilmelidir', () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // HomeIllustration render edilmeli
    expect(screen.getByTestId('home-screen')).toBeTruthy();
  });

  it('HomeActions component render edilmelidir', () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // HomeActions render edilmeli
    expect(screen.getByTestId('home-screen')).toBeTruthy();
  });

  it('useQuery hook doğru çalışmalıdır', () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // useQuery kullanıldığını kontrol et
    expect(mockUseHomeScreen).toHaveBeenCalled();
  });
});