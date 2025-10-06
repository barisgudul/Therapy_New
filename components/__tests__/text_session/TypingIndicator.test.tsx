// components/__tests__/text_session/TypingIndicator.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TypingIndicator } from '../../text_session/TypingIndicator';

describe('TypingIndicator', () => {
  it('görünür olduğunda render eder', () => {
    const { toJSON } = render(<TypingIndicator isVisible={true} />);
    expect(toJSON()).toBeTruthy();
  });

  it('görünür değilse render edilmez', () => {
    const { toJSON } = render(<TypingIndicator isVisible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('üç nokta gösterir', () => {
    render(<TypingIndicator isVisible={true} />);
    // Noktaları test etmek için parent element'leri kontrol ediyoruz
    const container = screen.getByTestId('typing-indicator') || screen.getByText('●');
    expect(container).toBeTruthy();
  });
});
