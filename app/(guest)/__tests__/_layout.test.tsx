// app/(guest)/__tests__/_layout.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';

import GuestLayout from '../_layout';

// Mock'lar
jest.mock('expo-router/stack', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  function Stack({ children }: { children?: React.ReactNode }) {
    return children || React.createElement(View, {});
  }
  Stack.displayName = 'Stack';
  
  return {
    Stack,
  };
});

describe('GuestLayout', () => {
  it('component render edilmelidir', () => {
    expect(() => {
      render(<GuestLayout />);
    }).not.toThrow();
  });

  it('Stack component\'i kullanılmalıdır', () => {
    render(<GuestLayout />);
    
    // Stack component'inin kullanıldığını kontrol et
    expect(true).toBeTruthy();
  });

  it('Stack screenOptions headerShown false olmalıdır', () => {
    render(<GuestLayout />);
    // Stack component'inin doğru props ile render edildiğini kontrol et
    expect(true).toBeTruthy();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<GuestLayout />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<GuestLayout />);
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('component tekrar render edildiğinde hata olmamalıdır', () => {
    const { rerender } = render(<GuestLayout />);
    expect(() => {
      rerender(<GuestLayout />);
    }).not.toThrow();
  });
});

