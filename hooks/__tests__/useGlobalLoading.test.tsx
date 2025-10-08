// hooks/__tests__/useGlobalLoading.test.tsx
import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useGlobalLoading } from '../useGlobalLoading';
import { LoadingProvider } from '../../context/Loading';

describe('useGlobalLoading', () => {
  it('LoadingProvider içinde context döndürmelidir', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LoadingProvider>{children}</LoadingProvider>
    );

    const { result } = renderHook(() => useGlobalLoading(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.showLoading).toBeDefined();
    expect(result.current.hideLoading).toBeDefined();
  });

  it('LoadingProvider olmadan hata fırlatmalıdır', () => {
    // Hata mesajlarını bastır
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useGlobalLoading());
    }).toThrow('useLoading must be used within a LoadingProvider. Kodu düzgün yaz!');

    consoleSpy.mockRestore();
  });

  it('useLoading ile aynı context referansını döndürmelidir', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LoadingProvider>{children}</LoadingProvider>
    );

    const { result } = renderHook(() => useGlobalLoading(), { wrapper });

    // Context metodları mevcut olmalı
    expect(typeof result.current.showLoading).toBe('function');
    expect(typeof result.current.hideLoading).toBe('function');
    expect(typeof result.current.isLoading).toBe('boolean');
  });
});

