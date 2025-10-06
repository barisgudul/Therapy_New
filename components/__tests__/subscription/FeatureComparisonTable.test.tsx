// components/__tests__/subscription/FeatureComparisonTable.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import FeatureComparisonTable from '../../subscription/FeatureComparisonTable';

describe('FeatureComparisonTable', () => {
  const mockComparisonData = [
    {
      feature: 'Test Özellik',
      plus: 'Sınırsız',
      premium: 'Sınırsız',
      icon: 'checkmark' as const
    },
    {
      feature: 'Başka Özellik',
      plus: '❌',
      premium: 'Sınırsız',
      icon: 'star' as const
    }
  ];

  const mockThemeColors = {
    plusColor: '#3B82F6',
    premiumColor: '#8B5CF6'
  };

  it('karşılaştırma tablosunu render eder', () => {
    render(
      <FeatureComparisonTable 
        comparisonData={mockComparisonData} 
        themeColors={mockThemeColors} 
      />
    );
    
    expect(screen.getByText('Ayrıcalıklar Dünyası')).toBeTruthy();
    expect(screen.getByText('+Plus')).toBeTruthy();
    expect(screen.getByText('Premium')).toBeTruthy();
  });

  it('özellikleri ve değerleri gösterir', () => {
    render(
      <FeatureComparisonTable 
        comparisonData={mockComparisonData} 
        themeColors={mockThemeColors} 
      />
    );
    
    expect(screen.getByText('Test Özellik')).toBeTruthy();
    expect(screen.getByText('Başka Özellik')).toBeTruthy();
  });

  it('checkmark ikonlarını doğru gösterir', () => {
    render(
      <FeatureComparisonTable
        comparisonData={mockComparisonData}
        themeColors={mockThemeColors}
      />
    );

    // Ionicons component'lerini test etmek için testID kullanıyoruz
    // checkmark ikonları için Ionicons component'lerini test ediyoruz
    const checkmarkIcons = screen.getAllByTestId('ionicons-checkmark');
    expect(checkmarkIcons).toHaveLength(3);
  });
});
