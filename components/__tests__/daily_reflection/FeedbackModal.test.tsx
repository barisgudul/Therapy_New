// components/__tests__/daily_reflection/FeedbackModal.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FeedbackModal from '../../../components/daily_reflection/FeedbackModal';

jest.mock('../../../utils/markdownRenderer', () => ({
  renderMarkdownText: (text: string, _accentColor: string) => {
    const React = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return React.createElement(Text, null, text);
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'Light' },
}));

describe('FeedbackModal', () => {
  const baseProps = {
    isVisible: true,
    onClose: jest.fn(),
    aiMessage: 'Merhaba dünya',
    gradientColors: ['#000', '#111'] as [string, string],
    dynamicColor: '#123456',
    satisfactionScore: null as number | null,
    onSatisfaction: jest.fn(),
    onNavigateToTherapy: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('başlık ve içerik metnini gösterir', () => {
    render(<FeedbackModal {...baseProps} />);
    expect(screen.getByText('home.feedback_modal.title')).toBeTruthy();
    expect(screen.getByText('Merhaba dünya')).toBeTruthy();
  });

  it('kapat butonuna basınca onClose çağrılır', () => {
    render(<FeedbackModal {...baseProps} />);
    // Kapat butonu Ionicons ile; erişilebilir metin olmadığı için başlığa basarak kapatma simülasyonu yapamayız.
    // Modal backdrop press jest-setup ile mock'lanmıyor, doğrudan kapat metnine basıyoruz.
    fireEvent.press(screen.getByText('home.feedback_modal.ok_button'));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('Sohbet Et butonuna basınca onNavigateToTherapy çağrılır', () => {
    render(<FeedbackModal {...baseProps} />);
    fireEvent.press(screen.getByText('home.feedback_modal.chat_button'));
    expect(baseProps.onNavigateToTherapy).toHaveBeenCalled();
  });

  it('memnuniyet butonları etkileşimini yönetir', () => {
    const onSatisfaction = jest.fn();
    render(<FeedbackModal {...baseProps} onSatisfaction={onSatisfaction} />);
    // Thumbs up/down ikonlarının ebeveynleri buton; metin olmadığından iki basış yapıyoruz
    const likeButton = screen.getByTestId('like-button');
    const dislikeButton = screen.getByTestId('dislike-button');
    fireEvent.press(likeButton);
    expect(onSatisfaction).toHaveBeenCalledWith(1);
    fireEvent.press(dislikeButton);
    expect(onSatisfaction).toHaveBeenCalledWith(-1);
  });

  it('hideSatisfaction true ise memnuniyet alanını göstermez', () => {
    render(<FeedbackModal {...baseProps} hideSatisfaction />);
    expect(screen.queryByText('home.feedback_modal.satisfaction_question')).toBeNull();
  });
});


