// components/__tests__/daily_reflection/InputModal.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import InputModal from '../../../components/daily_reflection/InputModal';

describe('InputModal', () => {
  const baseProps = {
    isVisible: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    note: 'Merhaba',
    onNoteChange: jest.fn(),
    dynamicColor: '#123456',
    gradientColors: ['#000', '#111'] as [string, string],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('başlık ve placeholder çevirilerini gösterir', () => {
    render(<InputModal {...baseProps} />);
    expect(screen.getByText('daily_reflection.input_modal.title')).toBeTruthy();
    expect(screen.getByText('daily_reflection.input_modal.subtitle')).toBeTruthy();
  });

  it('note içeriğini gösterir ve değişimi onNoteChange ile iletir', () => {
    const onNoteChange = jest.fn();
    render(<InputModal {...baseProps} onNoteChange={onNoteChange} />);
    const input = screen.getByDisplayValue('Merhaba');
    fireEvent.changeText(input, 'Yeni Not');
    expect(onNoteChange).toHaveBeenCalledWith('Yeni Not');
  });

  it('metin boşken submit butonu disabled olur', () => {
    render(<InputModal {...baseProps} note="" />);
    const submit = screen.getByText('daily_reflection.input_modal.submit');
    // Disabled buton için press çalışmamalı
    fireEvent.press(submit);
    expect(baseProps.onSubmit).not.toHaveBeenCalled();
  });

  it('submit butonuna basınca onSubmit çağrılır', () => {
    render(<InputModal {...baseProps} />);
    const submit = screen.getByText('daily_reflection.input_modal.submit');
    fireEvent.press(submit);
    expect(baseProps.onSubmit).toHaveBeenCalled();
  });
});


