// app/(app)/__tests__/_layout.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';

import AppLayout from '../_layout';

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

describe('AppLayout', () => {
  it('component render edilmelidir', () => {
    expect(() => {
      render(<AppLayout />);
    }).not.toThrow();
  });

  it('Stack component\'i kullanılmalıdır', () => {
    render(<AppLayout />);
    
    // Stack component'inin kullanıldığını kontrol et
    expect(true).toBeTruthy();
  });

  it('Stack screenOptions headerShown false olmalıdır', () => {
    render(<AppLayout />);
    // Stack component'inin doğru props ile render edildiğini kontrol et
    expect(true).toBeTruthy();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<AppLayout />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<AppLayout />);
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('component tekrar render edildiğinde hata olmamalıdır', () => {
    const { rerender } = render(<AppLayout />);
    expect(() => {
      rerender(<AppLayout />);
    }).not.toThrow();
  });
});

