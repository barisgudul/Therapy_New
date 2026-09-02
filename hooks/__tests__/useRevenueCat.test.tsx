// hooks/__tests__/useRevenueCat.test.tsx

import { renderHook, act } from '@testing-library/react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import Purchases from 'react-native-purchases';
import Toast from 'react-native-toast-message';
import { useRevenueCat } from '../useRevenueCat';

const mockInvalidate = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

describe('useRevenueCat', () => {
  beforeEach(() => jest.clearAllMocks());

  it('presentPaywall returns true and refreshes on purchase', async () => {
    (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValueOnce(
      PAYWALL_RESULT.PURCHASED,
    );
    const { result } = renderHook(() => useRevenueCat());

    let purchased: boolean | undefined;
    await act(async () => {
      purchased = await result.current.presentPaywall();
    });

    expect(purchased).toBe(true);
    expect(RevenueCatUI.presentPaywallIfNeeded).toHaveBeenCalledWith({
      requiredEntitlementIdentifier: 'gisbel',
    });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['currentSubscription'] });
  });

  it('presentPaywall returns false when not presented', async () => {
    (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValueOnce(
      PAYWALL_RESULT.NOT_PRESENTED,
    );
    const { result } = renderHook(() => useRevenueCat());

    let purchased: boolean | undefined;
    await act(async () => {
      purchased = await result.current.presentPaywall();
    });
    expect(purchased).toBe(false);
  });

  it('restore toasts info when nothing to restore', async () => {
    (Purchases.isConfigured as jest.Mock).mockResolvedValue(true);
    (Purchases.restorePurchases as jest.Mock).mockResolvedValueOnce({
      entitlements: { active: {} },
    });
    const { result } = renderHook(() => useRevenueCat());

    await act(async () => {
      await result.current.restore();
    });

    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'info', text1: 'subscription.restore_none' }),
    );
  });

  it('restore toasts success when a plan is restored', async () => {
    (Purchases.isConfigured as jest.Mock).mockResolvedValue(true);
    (Purchases.restorePurchases as jest.Mock).mockResolvedValueOnce({
      entitlements: { active: { gisbel: {} } },
    });
    const { result } = renderHook(() => useRevenueCat());

    await act(async () => {
      await result.current.restore();
    });

    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', text1: 'subscription.restore_ok' }),
    );
  });
});
