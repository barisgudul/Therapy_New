// components/__tests__/shared/ErrorFallbackUI.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ErrorFallbackUI } from '../../shared/ErrorFallbackUI';

describe('ErrorFallbackUI', () => {
  it('hata mesajını ve butonunu gösterir', () => {
    render(<ErrorFallbackUI resetError={jest.fn()} />);
    
    // i18n: mock t(key) => key döndürür
    expect(screen.getByText('error.fallback_title')).toBeTruthy();
    expect(screen.getByText('error.fallback_message')).toBeTruthy();
    expect(screen.getByText('error.retry')).toBeTruthy();
  });

  it('tekrar dene butonuna basınca resetError çağrılır', () => {
    const resetError = jest.fn();
    render(<ErrorFallbackUI resetError={resetError} />);

    fireEvent.press(screen.getByText('error.retry'));
    expect(resetError).toHaveBeenCalled();
  });
});
