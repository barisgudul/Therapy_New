// components/__tests__/how_it_works/StepCard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StepCard } from '../../how_it_works/StepCard';

describe('StepCard', () => {
  const mockStep = {
    number: 1,
    title: 'Test Adım',
    description: 'Bu bir test açıklamasıdır'
  };

  it('adım numarasını, başlığı ve açıklamayı gösterir', () => {
    render(<StepCard step={mockStep} />);
    
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('Test Adım')).toBeTruthy();
    expect(screen.getByText('Bu bir test açıklamasıdır')).toBeTruthy();
  });

  it('farklı adım verileriyle çalışır', () => {
    const differentStep = {
      number: 3,
      title: 'Farklı Adım',
      description: 'Farklı açıklama'
    };
    
    render(<StepCard step={differentStep} />);
    
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('Farklı Adım')).toBeTruthy();
    expect(screen.getByText('Farklı açıklama')).toBeTruthy();
  });
});
