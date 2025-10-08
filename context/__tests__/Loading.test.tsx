// context/__tests__/Loading.test.tsx
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { LoadingProvider, useLoading } from '../Loading';

describe('Loading Context', () => {
  describe('LoadingProvider', () => {
    it('children render edilmelidir', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <LoadingProvider>{children}</LoadingProvider>
      );

      const { result } = renderHook(() => useLoading(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.loadingMessage).toBeUndefined();
    });

    it('başlangıçta loading false olmalıdır', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <LoadingProvider>{children}</LoadingProvider>
      );

      const { result } = renderHook(() => useLoading(), { wrapper });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useLoading hook', () => {
    it('LoadingProvider olmadan hata fırlatmalıdır', () => {
      // Hata mesajlarını bastır
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useLoading());
      }).toThrow('useLoading must be used within a LoadingProvider. Kodu düzgün yaz!');

      consoleSpy.mockRestore();
    });

    it('showLoading çağrıldığında loading true olmalıdır', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <LoadingProvider>{children}</LoadingProvider>
      );

      const { result } = renderHook(() => useLoading(), { wrapper });

      act(() => {
        result.current.showLoading();
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('showLoading mesaj ile çağrıldığında loadingMessage ayarlanmalıdır', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <LoadingProvider>{children}</LoadingProvider>
      );

      const { result } = renderHook(() => useLoading(), { wrapper });

      act(() => {
        result.current.showLoading('Yükleniyor...');
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingMessage).toBe('Yükleniyor...');
    });

    it('hideLoading çağrıldığında loading false olmalıdır', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <LoadingProvider>{children}</LoadingProvider>
      );

      const { result } = renderHook(() => useLoading(), { wrapper });

      act(() => {
        result.current.showLoading('Test mesajı');
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.hideLoading();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.loadingMessage).toBeUndefined();
    });

    it('birden fazla showLoading/hideLoading çağrısı çalışmalıdır', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <LoadingProvider>{children}</LoadingProvider>
      );

      const { result } = renderHook(() => useLoading(), { wrapper });

      // İlk gösterme
      act(() => {
        result.current.showLoading('İlk mesaj');
      });
      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingMessage).toBe('İlk mesaj');

      // Gizleme
      act(() => {
        result.current.hideLoading();
      });
      expect(result.current.isLoading).toBe(false);

      // İkinci gösterme
      act(() => {
        result.current.showLoading('İkinci mesaj');
      });
      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingMessage).toBe('İkinci mesaj');

      // Tekrar gizleme
      act(() => {
        result.current.hideLoading();
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.loadingMessage).toBeUndefined();
    });

    it('showLoading mesaj olmadan çağrıldığında loadingMessage undefined olmalıdır', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <LoadingProvider>{children}</LoadingProvider>
      );

      const { result } = renderHook(() => useLoading(), { wrapper });

      act(() => {
        result.current.showLoading();
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingMessage).toBeUndefined();
    });
  });
});

