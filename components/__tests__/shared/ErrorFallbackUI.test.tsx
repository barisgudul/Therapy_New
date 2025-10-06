// components/__tests__/shared/ErrorFallbackUI.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ErrorFallbackUI } from '../../shared/ErrorFallbackUI';

describe('ErrorFallbackUI', () => {
  it('hata mesajını ve butonunu gösterir', () => {
    render(<ErrorFallbackUI resetError={jest.fn()} />);
    
    expect(screen.getByText('Eyvah, Bir Şeyler Ters Gitti')).toBeTruthy();
    expect(screen.getByText('Beklenmedik bir hata oluştu. Ekibimiz bilgilendirildi. Lütfen tekrar deneyin.')).toBeTruthy();
    expect(screen.getByText('Tekrar Dene')).toBeTruthy();
  });

  it('tekrar dene butonuna basınca resetError çağrılır', () => {
    const resetError = jest.fn();
    render(<ErrorFallbackUI resetError={resetError} />);
    
    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(resetError).toHaveBeenCalled();
  });
});
