// services/__tests__/revenuecat.service.test.ts

import Purchases from 'react-native-purchases';
import { resolvePlanName } from '../../constants/revenuecat';
import {
  getPlanFromCustomerInfo,
  getCurrentPlanFromRevenueCat,
} from '../revenuecat.service';

const info = (active: Record<string, unknown>) =>
  ({ entitlements: { active } }) as any;

describe('resolvePlanName', () => {
  it('maps gisbel -> Premium', () => {
    expect(resolvePlanName(['gisbel'])).toBe('Premium');
  });
  it('maps plus -> +Plus', () => {
    expect(resolvePlanName(['plus'])).toBe('+Plus');
  });
  it('prefers gisbel when both are active', () => {
    expect(resolvePlanName(['plus', 'gisbel'])).toBe('Premium');
  });
  it('defaults to Free with no entitlements', () => {
    expect(resolvePlanName([])).toBe('Free');
  });
});

describe('getPlanFromCustomerInfo', () => {
  it('reads the active entitlement keys', () => {
    expect(getPlanFromCustomerInfo(info({ gisbel: {} }))).toBe('Premium');
    expect(getPlanFromCustomerInfo(info({}))).toBe('Free');
  });
});

describe('getCurrentPlanFromRevenueCat', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns null when the SDK is not configured', async () => {
    (Purchases.isConfigured as jest.Mock).mockResolvedValueOnce(false);
    expect(await getCurrentPlanFromRevenueCat()).toBeNull();
  });

  it('returns the tier from CustomerInfo when configured', async () => {
    (Purchases.isConfigured as jest.Mock).mockResolvedValueOnce(true);
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(info({ gisbel: {} }));
    expect(await getCurrentPlanFromRevenueCat()).toBe('Premium');
  });
});
