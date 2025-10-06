// components/__tests__/subscription/PlanCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PlanCard from '../../subscription/PlanCard';

describe('PlanCard', () => {
  const mockPlan = {
    id: '1',
    name: 'Premium',
    description: 'Test açıklama',
    price: 9.99
  };

  const mockTheme = {
    gradient: ['#8B5CF6', '#A855F7'],
    textColor: '#FFFFFF',
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    icon: 'diamond' as const
  };

  it('plan bilgilerini gösterir', () => {
    render(
      <PlanCard 
        plan={mockPlan}
        theme={mockTheme}
        isCurrent={false}
        isLoading={false}
        onUpgrade={jest.fn()}
      />
    );
    
    expect(screen.getByText('Premium')).toBeTruthy();
    expect(screen.getByText('Test açıklama')).toBeTruthy();
    expect(screen.getByText('$9.99')).toBeTruthy();
  });

  it('ücretsiz plan için doğru fiyatı gösterir', () => {
    const freePlan = { ...mockPlan, price: 0 };
    render(
      <PlanCard 
        plan={freePlan}
        theme={mockTheme}
        isCurrent={false}
        isLoading={false}
        onUpgrade={jest.fn()}
      />
    );
    
    expect(screen.getByText('Ücretsiz')).toBeTruthy();
  });

  it('mevcut plan için doğru butonu gösterir', () => {
    render(
      <PlanCard 
        plan={mockPlan}
        theme={mockTheme}
        isCurrent={true}
        isLoading={false}
        onUpgrade={jest.fn()}
      />
    );
    
    expect(screen.getByText('Mevcut Planınız')).toBeTruthy();
  });

  it('yükleme durumunda loading gösterir', () => {
    render(
      <PlanCard 
        plan={mockPlan}
        theme={mockTheme}
        isCurrent={false}
        isLoading={true}
        onUpgrade={jest.fn()}
      />
    );
    
    expect(screen.getByTestId('activity-indicator')).toBeTruthy();
  });

  it('upgrade butonuna basınca onUpgrade çağrılır', () => {
    const onUpgrade = jest.fn();
    render(
      <PlanCard 
        plan={mockPlan}
        theme={mockTheme}
        isCurrent={false}
        isLoading={false}
        onUpgrade={onUpgrade}
      />
    );
    
    fireEvent.press(screen.getByText("Premium'a Yükselt"));
    expect(onUpgrade).toHaveBeenCalled();
  });

  it('Premium plan için tavsiye edilen rozetini gösterir', () => {
    render(
      <PlanCard 
        plan={mockPlan}
        theme={mockTheme}
        isCurrent={false}
        isLoading={false}
        onUpgrade={jest.fn()}
      />
    );
    
    expect(screen.getByText('Tavsiye Edilen')).toBeTruthy();
  });
});
