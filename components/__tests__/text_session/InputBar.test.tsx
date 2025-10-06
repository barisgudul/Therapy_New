// components/__tests__/text_session/InputBar.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { InputBar } from '../../text_session/InputBar';

describe('InputBar', () => {
  const baseProps = {
    input: 'Test mesajı',
    onInputChange: jest.fn(),
    onSend: jest.fn(),
    isTyping: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('input değerini gösterir', () => {
    render(<InputBar {...baseProps} />);
    expect(screen.getByDisplayValue('Test mesajı')).toBeTruthy();
  });

  it('placeholder gösterir', () => {
    render(<InputBar {...baseProps} input="" />);
    expect(screen.getByPlaceholderText('text_session.input_placeholder')).toBeTruthy();
  });

  it('input değişikliğini handle eder', () => {
    render(<InputBar {...baseProps} />);
    const input = screen.getByDisplayValue('Test mesajı');
    fireEvent.changeText(input, 'Yeni mesaj');
    expect(baseProps.onInputChange).toHaveBeenCalledWith('Yeni mesaj');
  });

  it('gönder butonuna basınca onSend çağrılır', () => {
    render(<InputBar {...baseProps} />);
    const sendButton = screen.getByTestId('send-button');
    fireEvent.press(sendButton);
    expect(baseProps.onSend).toHaveBeenCalled();
  });

  it('boş input ile gönder butonu disabled olur', () => {
    render(<InputBar {...baseProps} input="" />);
    const sendButton = screen.getByTestId('send-button');
    fireEvent.press(sendButton);
    expect(baseProps.onSend).not.toHaveBeenCalled();
  });

  it('yazarken gönder butonu disabled olur', () => {
    render(<InputBar {...baseProps} isTyping={true} />);
    const sendButton = screen.getByTestId('send-button');
    fireEvent.press(sendButton);
    expect(baseProps.onSend).not.toHaveBeenCalled();
  });
});
