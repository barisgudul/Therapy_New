// app/__tests__/agentic-test.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import AgenticTestScreen from '../agentic-test';

// Mock'lar
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

describe('AgenticTestScreen', () => {
  it('component render edilmelidir', () => {
    render(<AgenticTestScreen />);
    
    expect(screen.getByText('🚨 FAZ 0: STABİLİZASYON')).toBeTruthy();
  });

  it('stabilizasyon uyarısı gösterilmelidir', () => {
    render(<AgenticTestScreen />);
    
    expect(screen.getByText(/maliyet optimizasyonu için geçici/)).toBeTruthy();
  });

  it('mevcut durum bilgisi gösterilmelidir', () => {
    render(<AgenticTestScreen />);
    
    expect(screen.getByText(/Geleneksel handler sistemi aktif/)).toBeTruthy();
  });

  it('gelecek fazlar bilgisi gösterilmelidir', () => {
    render(<AgenticTestScreen />);
    
    expect(screen.getByText(/FAZ 1: Stratejik Sorgu Yönlendirici/)).toBeTruthy();
    expect(screen.getByText(/FAZ 2: Kontrollü hibrit pipeline sistemi/)).toBeTruthy();
  });

  it('tasarruf durumu başlığı gösterilmelidir', () => {
    render(<AgenticTestScreen />);
    
    expect(screen.getByText('💰 TASARRUF DURUMU')).toBeTruthy();
  });

  it('tüm sistem durumları gösterilmelidir', () => {
    render(<AgenticTestScreen />);
    
    expect(screen.getByText(/Ana beyin çağrıları: ❌ DURDURULDU/)).toBeTruthy();
    expect(screen.getByText(/DNA işleme: ❌ DURDURULDU/)).toBeTruthy();
    expect(screen.getByText(/Hafıza embedding: ❌ DURDURULDU/)).toBeTruthy();
    expect(screen.getByText(/Geleneksel handler: ✅ AKTİF/)).toBeTruthy();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<AgenticTestScreen />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<AgenticTestScreen />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
