// components/__tests__/text_session/MemoryModal.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MemoryModal } from '../../text_session/MemoryModal';

describe('MemoryModal', () => {
  const mockMemory = {
    content: 'Test hafıza içeriği',
    source_layer: 'content'
  };

  const baseProps = {
    isVisible: true,
    memory: mockMemory,
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hafıza içeriğini gösterir', () => {
    render(<MemoryModal {...baseProps} />);
    expect(screen.getByText('Test hafıza içeriği')).toBeTruthy();
  });

  it('farklı source layer için doğru ikon ve başlık gösterir', () => {
    const sentimentMemory = { ...mockMemory, source_layer: 'sentiment' };
    render(<MemoryModal {...baseProps} memory={sentimentMemory} />);
    expect(screen.getByText('text_session.memory.sentiment_title')).toBeTruthy();
  });

  it('memory null ise render edilmez', () => {
    const { toJSON } = render(<MemoryModal {...baseProps} memory={null} />);
    expect(toJSON()).toBeNull();
  });

  it('kapat butonuna basınca onClose çağrılır', () => {
    render(<MemoryModal {...baseProps} />);
    const closeButton = screen.getByTestId('close-button');
    fireEvent.press(closeButton);
    expect(baseProps.onClose).toHaveBeenCalled();
  });
});
