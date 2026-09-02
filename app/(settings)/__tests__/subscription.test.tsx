// app/(settings)/__tests__/subscription.test.tsx

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import SubscriptionScreen from '../subscription';

const mockBack = jest.fn();
jest.mock('expo-router/', () => ({ useRouter: () => ({ back: mockBack }) }));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockRestore = jest.fn();
jest.mock('../../../hooks/useRevenueCat', () => ({
  useRevenueCat: () => ({
    restore: mockRestore,
    presentPaywall: jest.fn(),
    presentCustomerCenter: jest.fn(),
  }),
}));

const mockInvalidate = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));

// RevenueCatUI.Paywall as an inspectable stub.
jest.mock('react-native-purchases-ui', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { Paywall: (props: any) => <View testID="rc-paywall" {...props} /> },
    PAYWALL_RESULT: {},
  };
});

describe('SubscriptionScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the RevenueCat paywall', () => {
    const { getByTestId } = render(<SubscriptionScreen />);
    expect(getByTestId('rc-paywall')).toBeTruthy();
  });

  it('closes the screen when the paywall is dismissed', () => {
    const { getByTestId } = render(<SubscriptionScreen />);
    getByTestId('rc-paywall').props.onDismiss();
    expect(mockBack).toHaveBeenCalled();
  });

  it('invalidates subscription queries and closes after a purchase', () => {
    const { getByTestId } = render(<SubscriptionScreen />);
    getByTestId('rc-paywall').props.onPurchaseCompleted();
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['currentSubscription'] });
    expect(mockBack).toHaveBeenCalled();
  });

  it('triggers restore from the header button', () => {
    const { getByText } = render(<SubscriptionScreen />);
    fireEvent.press(getByText('subscription.restore_button'));
    expect(mockRestore).toHaveBeenCalled();
  });
});
