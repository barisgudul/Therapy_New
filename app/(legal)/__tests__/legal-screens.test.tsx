// app/(legal)/__tests__/legal-screens.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LegalDocScreen from '../[doc]';
import ConsentScreen from '../consent';
import { useConsentStore } from '../../../store/consentStore';
import { LEGAL_VERSION } from '../../../constants/legal';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: { doc?: string } = { doc: 'privacy' };

jest.mock('expo-router/', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('react-native-markdown-display', () => 'Markdown');

describe('legal screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { doc: 'privacy' };
    useConsentStore.getState().reset();
  });

  it('renders the requested document title', () => {
    render(<LegalDocScreen />);
    expect(screen.getByText('legal.doc_title.privacy')).toBeTruthy();
  });

  it('falls back to privacy for an unknown doc param', () => {
    mockParams = { doc: 'nonsense' };
    render(<LegalDocScreen />);
    expect(screen.getByText('legal.doc_title.privacy')).toBeTruthy();
  });

  it('close button navigates back', () => {
    render(<LegalDocScreen />);
    fireEvent.press(screen.getByTestId('legal-close'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('consent: accept is blocked until the checkbox is ticked', () => {
    render(<ConsentScreen />);
    fireEvent.press(screen.getByTestId('consent-accept'));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useConsentStore.getState().acceptedVersion).toBeNull();
  });

  it('consent: ticking then accepting records the version and routes on', () => {
    render(<ConsentScreen />);
    fireEvent.press(screen.getByTestId('consent-checkbox'));
    fireEvent.press(screen.getByTestId('consent-accept'));
    expect(useConsentStore.getState().acceptedVersion).toBe(LEGAL_VERSION);
    expect(mockReplace).toHaveBeenCalledWith('/(app)');
  });
});
