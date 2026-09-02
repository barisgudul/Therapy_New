// store/__tests__/consentStore.test.ts
import { act } from '@testing-library/react-native';
import { hasCurrentConsent, useConsentStore } from '../consentStore';
import { LEGAL_VERSION } from '../../constants/legal';

describe('consentStore', () => {
  beforeEach(() => {
    act(() => useConsentStore.getState().reset());
  });

  it('starts with no acceptance', () => {
    const s = useConsentStore.getState();
    expect(s.acceptedVersion).toBeNull();
    expect(hasCurrentConsent(s.acceptedVersion)).toBe(false);
  });

  it('records the accepted version and locale', () => {
    act(() => useConsentStore.getState().accept(LEGAL_VERSION, 'tr'));
    const s = useConsentStore.getState();
    expect(s.acceptedVersion).toBe(LEGAL_VERSION);
    expect(s.locale).toBe('tr');
    expect(s.acceptedAt).toEqual(expect.any(String));
    expect(hasCurrentConsent(s.acceptedVersion)).toBe(true);
  });

  it('treats a stale version as not-consented', () => {
    act(() => useConsentStore.getState().accept('1999-01-01', 'en'));
    expect(hasCurrentConsent(useConsentStore.getState().acceptedVersion)).toBe(false);
  });

  it('reset clears acceptance', () => {
    act(() => useConsentStore.getState().accept(LEGAL_VERSION, 'en'));
    act(() => useConsentStore.getState().reset());
    expect(useConsentStore.getState().acceptedVersion).toBeNull();
  });
});
