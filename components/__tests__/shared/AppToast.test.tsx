// components/__tests__/shared/AppToast.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AppToast } from '../../shared/AppToast';

describe('AppToast', () => {
  it('varsayılan info variant ile render eder', () => {
    render(<AppToast text1="Test Başlık" text2="Test Mesaj" />);
    expect(screen.getByText('Test Başlık')).toBeTruthy();
    expect(screen.getByText('Test Mesaj')).toBeTruthy();
  });

  it('success variant ile render eder', () => {
    render(<AppToast variant="success" text1="Başarılı" text2="İşlem tamamlandı" />);
    expect(screen.getByText('Başarılı')).toBeTruthy();
    expect(screen.getByText('İşlem tamamlandı')).toBeTruthy();
  });

  it('error variant ile render eder', () => {
    render(<AppToast variant="error" text1="Hata" text2="Bir hata oluştu" />);
    expect(screen.getByText('Hata')).toBeTruthy();
    expect(screen.getByText('Bir hata oluştu')).toBeTruthy();
  });

  it('sadece text1 ile render eder', () => {
    render(<AppToast text1="Sadece başlık" />);
    expect(screen.getByText('Sadece başlık')).toBeTruthy();
    expect(screen.queryByText('Test Mesaj')).toBeNull();
  });
});
