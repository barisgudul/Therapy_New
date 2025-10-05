// components/__tests__/dream/FeedbackCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FeedbackCard from '../../dream/FeedbackCard';

describe('FeedbackCard', () => {
  const onSubmitFeedbackMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('başlığı ve soruyu göstermelidir', () => {
    render(
      <FeedbackCard 
        isSubmitting={false} 
        feedbackSent={false} 
        onSubmitFeedback={onSubmitFeedbackMock} 
      />
    );
    
    expect(screen.getByText('dream.components.feedback.title')).toBeTruthy();
    expect(screen.getByText('dream.components.feedback.question')).toBeTruthy();
  });

  it('feedback gönderilmemişken thumbs up ve down butonlarını göstermelidir', () => {
    render(
      <FeedbackCard 
        isSubmitting={false} 
        feedbackSent={false} 
        onSubmitFeedback={onSubmitFeedbackMock} 
      />
    );
    
    // Butonları icon'ları ile test et
    const thumbsUpIcon = screen.getByTestId('thumbs-up-outline');
    const thumbsDownIcon = screen.getByTestId('thumbs-down-outline');
    
    expect(thumbsUpIcon).toBeTruthy();
    expect(thumbsDownIcon).toBeTruthy();
  });

  it('isSubmitting true olduğunda ActivityIndicator göstermelidir', () => {
    render(
      <FeedbackCard 
        isSubmitting={true} 
        feedbackSent={false} 
        onSubmitFeedback={onSubmitFeedbackMock} 
      />
    );
    
    // ActivityIndicator'ı test et
    expect(screen.getByTestId('activity-indicator')).toBeTruthy();
  });

  it('feedbackSent true olduğunda teşekkür mesajını göstermelidir', () => {
    render(
      <FeedbackCard 
        isSubmitting={false} 
        feedbackSent={true} 
        onSubmitFeedback={onSubmitFeedbackMock} 
      />
    );
    
    expect(screen.getByText('dream.components.feedback.thanks')).toBeTruthy();
  });

  it('thumbs up butonuna basıldığında onSubmitFeedback(1) çağrılmalıdır', () => {
    render(
      <FeedbackCard 
        isSubmitting={false} 
        feedbackSent={false} 
        onSubmitFeedback={onSubmitFeedbackMock} 
      />
    );
    
    // TouchableOpacity'yi icon ile bul ve test et
    const thumbsUpIcon = screen.getByTestId('thumbs-up-outline');
    const thumbsUpButton = thumbsUpIcon.parent;
    
    if (thumbsUpButton) {
      fireEvent.press(thumbsUpButton as any);
      expect(onSubmitFeedbackMock).toHaveBeenCalledWith(1);
    }
  });

  it('thumbs down butonuna basıldığında onSubmitFeedback(-1) çağrılmalıdır', () => {
    render(
      <FeedbackCard 
        isSubmitting={false} 
        feedbackSent={false} 
        onSubmitFeedback={onSubmitFeedbackMock} 
      />
    );
    
    // TouchableOpacity'yi icon ile bul ve test et
    const thumbsDownIcon = screen.getByTestId('thumbs-down-outline');
    const thumbsDownButton = thumbsDownIcon.parent;
    
    if (thumbsDownButton) {
      fireEvent.press(thumbsDownButton as any);
      expect(onSubmitFeedbackMock).toHaveBeenCalledWith(-1);
    }
  });

  it('component doğru şekilde render edilmelidir', () => {
    const { toJSON } = render(
      <FeedbackCard 
        isSubmitting={false} 
        feedbackSent={false} 
        onSubmitFeedback={onSubmitFeedbackMock} 
      />
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
