// components/__tests__/ProcessingScreen.simple.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ProcessingScreen from '../ProcessingScreen';

// Basit test - sadece render kontrolü
describe('ProcessingScreen - Basit Test', () => {
  it('verilen metni göstermelidir', () => {
    const testText = 'Test metni';
    
    // Mock fonksiyon
    const mockOnComplete = jest.fn();
    
    render(<ProcessingScreen text={testText} onComplete={mockOnComplete} />);
    
    // Metin görünüyor mu?
    expect(screen.getByText(testText)).toBeTruthy();
  });
});
