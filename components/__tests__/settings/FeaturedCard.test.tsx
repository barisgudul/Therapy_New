// components/__tests__/settings/FeaturedCard.test.tsx
/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FeaturedCard } from '../../settings/FeaturedCard';

jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: jest.fn(() => ({
    isPremium: false,
    planName: 'Free',
    isLoading: false
  }))
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn()
  }))
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.featuredCard.free_label': 'Ücretsiz Plan',
        'settings.featuredCard.free_subtitle': 'Temel özellikler',
        'settings.featuredCard.premium_label': 'Premium Plan',
        'settings.featuredCard.premium_subtitle': 'Tüm özellikler'
      };
      return translations[key] || key;
    }
  })
}));

describe('FeaturedCard', () => {
  it('ücretsiz kullanıcı için doğru içeriği gösterir', () => {
    render(<FeaturedCard />);
    expect(screen.getByText('Ücretsiz Plan')).toBeTruthy();
    expect(screen.getByText('Temel özellikler')).toBeTruthy();
  });

  it('premium kullanıcı için doğru içeriği gösterir', () => {
    const { useSubscription } = require('../../../hooks/useSubscription');
    useSubscription.mockImplementation(() => ({
      isPremium: true,
      planName: 'Pro',
      isLoading: false
    }));

    render(<FeaturedCard />);
    expect(screen.getByText('Premium Plan')).toBeTruthy();
    expect(screen.getByText('Tüm özellikler')).toBeTruthy();
  });

  it('yüklenirken loading gösterir', () => {
    const { useSubscription } = require('../../../hooks/useSubscription');
    useSubscription.mockImplementation(() => ({
      isPremium: false,
      planName: 'Free',
      isLoading: true
    }));

    render(<FeaturedCard />);
    expect(screen.getByTestId('activity-indicator')).toBeTruthy();
  });

  it('basıldığında subscription sayfasına gider', () => {
    const { useRouter } = require('expo-router');
    const { useSubscription } = require('../../../hooks/useSubscription');
    const mockPush = jest.fn();
    
    useRouter.mockImplementation(() => ({ push: mockPush }));
    useSubscription.mockImplementation(() => ({
      isPremium: false,
      planName: 'Free',
      isLoading: false
    }));

    render(<FeaturedCard />);
    const card = screen.getByText('Ücretsiz Plan').parent?.parent;
    if (card) fireEvent.press(card);
    expect(mockPush).toHaveBeenCalledWith('/(settings)/subscription');
  });
});
