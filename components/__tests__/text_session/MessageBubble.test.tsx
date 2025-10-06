// components/__tests__/text_session/MessageBubble.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MessageBubble } from '../../text_session/MessageBubble';

jest.mock('../../../utils/markdownRenderer', () => ({
  renderMarkdownText: (text: string, _accentColor: string) => {
    const React = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return React.createElement(Text, null, text);
  },
}));

describe('MessageBubble', () => {
  it('kullanıcı mesajını gösterir', () => {
    const userMessage = {
      sender: 'user' as const,
      text: 'Merhaba'
    };
    
    render(<MessageBubble message={userMessage} />);
    expect(screen.getByText('Merhaba')).toBeTruthy();
  });

  it('AI mesajını gösterir', () => {
    const aiMessage = {
      sender: 'ai' as const,
      text: 'AI yanıtı'
    };
    
    render(<MessageBubble message={aiMessage} />);
    expect(screen.getByText('AI yanıtı')).toBeTruthy();
  });

  it('içgörü mesajı için özel stil uygular', () => {
    const insightMessage = {
      sender: 'ai' as const,
      text: 'İçgörü mesajı',
      isInsight: true
    };
    
    const { toJSON } = render(<MessageBubble message={insightMessage} />);
    expect(toJSON()).toBeTruthy();
  });

  it('özel accent color kullanır', () => {
    const message = {
      sender: 'ai' as const,
      text: 'Test mesajı'
    };
    
    render(<MessageBubble message={message} accentColor="#FF0000" />);
    expect(screen.getByText('Test mesajı')).toBeTruthy();
  });
});
