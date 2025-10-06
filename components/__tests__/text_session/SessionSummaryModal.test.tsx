// components/__tests__/text_session/SessionSummaryModal.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SessionSummaryModal from '../../text_session/SessionSummaryModal';

jest.mock('../../../utils/markdownRenderer', () => ({
  renderMarkdownText: (text: string, _accentColor: string) => {
    const React = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return React.createElement(Text, null, text);
  },
}));

describe('SessionSummaryModal', () => {
  const baseProps = {
    isVisible: true,
    onClose: jest.fn(),
    summaryText: 'Test özet metni'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('başlık ve özet metnini gösterir', () => {
    render(<SessionSummaryModal {...baseProps} />);
    expect(screen.getByText('Sohbet Özeti')).toBeTruthy();
    expect(screen.getByText('Bu görüşmeden çıkan kısa özet')).toBeTruthy();
    expect(screen.getByText('Test özet metni')).toBeTruthy();
  });

  it('özel başlık ve alt başlık kullanır', () => {
    render(
      <SessionSummaryModal 
        {...baseProps} 
        title="Özel Başlık" 
        subtitle="Özel Alt Başlık" 
      />
    );
    expect(screen.getByText('Özel Başlık')).toBeTruthy();
    expect(screen.getByText('Özel Alt Başlık')).toBeTruthy();
  });

  it('kapat butonuna basınca onClose çağrılır', () => {
    render(<SessionSummaryModal {...baseProps} />);
    const closeButton = screen.getByText('transcripts.summary.close_button');
    fireEvent.press(closeButton);
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('görünür değilse render edilmez', () => {
    const { toJSON } = render(<SessionSummaryModal {...baseProps} isVisible={false} />);
    expect(toJSON()).toBeNull();
  });
});
