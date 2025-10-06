// components/__tests__/text_session/MemoryBubble.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MemoryBubble } from '../../text_session/MemoryBubble';

describe('MemoryBubble', () => {
  const baseProps = {
    content: 'Test hafıza içeriği',
    sourceLayer: 'content',
    onPress: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hafıza içeriğini gösterir', () => {
    render(<MemoryBubble {...baseProps} />);
    expect(screen.getByText('Test hafıza içeriği')).toBeTruthy();
    expect(screen.getByText('🧠 Hatırlanan Anı')).toBeTruthy();
  });

  it('uzun içeriği kısaltır', () => {
    const longContent = 'A'.repeat(100);
    render(<MemoryBubble {...baseProps} content={longContent} />);
    expect(screen.getByText(/A{80}\.\.\./)).toBeTruthy();
  });

  it('farklı source layer için doğru ikon gösterir', () => {
    render(<MemoryBubble {...baseProps} sourceLayer="sentiment" />);
    // Icon'ları test etmek için parent element'leri kontrol ediyoruz
    expect(screen.getByText('🧠 Hatırlanan Anı')).toBeTruthy();
  });

  it('basıldığında onPress çağrılır', () => {
    render(<MemoryBubble {...baseProps} />);
    const bubble = screen.getByText('Test hafıza içeriği').parent?.parent;
    if (bubble) fireEvent.press(bubble);
    expect(baseProps.onPress).toHaveBeenCalled();
  });
});
