// components/__tests__/therapy/TherapyOptionCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TherapyOptionCard } from '../../therapy/TherapyOptionCard';

describe('TherapyOptionCard', () => {
  const mockTherapyOption = {
    id: '1',
    title: 'Test Terapi',
    description: 'Test açıklama',
    icon: 'heart' as const,
    colors: ['#FF6B6B', '#4ECDC4'] as const,
    route: '/test-route',
    features: ['Özellik 1', 'Özellik 2']
  };

  it('terapi seçeneği bilgilerini gösterir', () => {
    render(
      <TherapyOptionCard 
        item={mockTherapyOption} 
        onPress={jest.fn()} 
      />
    );
    
    expect(screen.getByText('Test Terapi')).toBeTruthy();
    expect(screen.getByText('Test açıklama')).toBeTruthy();
    expect(screen.getByText('Özellik 1')).toBeTruthy();
    expect(screen.getByText('Özellik 2')).toBeTruthy();
  });

  it('basıldığında onPress çağrılır', () => {
    const onPress = jest.fn();
    render(
      <TherapyOptionCard 
        item={mockTherapyOption} 
        onPress={onPress} 
      />
    );
    
    const card = screen.getByText('Test Terapi').parent?.parent;
    if (card) fireEvent.press(card);
    expect(onPress).toHaveBeenCalledWith('/test-route');
  });

  it('farklı özelliklerle çalışır', () => {
    const differentOption = {
      ...mockTherapyOption,
      title: 'Farklı Terapi',
      features: ['Farklı Özellik']
    };
    
    render(
      <TherapyOptionCard 
        item={differentOption} 
        onPress={jest.fn()} 
      />
    );
    
    expect(screen.getByText('Farklı Terapi')).toBeTruthy();
    expect(screen.getByText('Farklı Özellik')).toBeTruthy();
  });
});
