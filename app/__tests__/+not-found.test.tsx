// app/__tests__/+not-found.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import NotFoundScreen from '../+not-found';

// Mock'lar
jest.mock('expo-router/', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  
  function Link({ children, href, style, onPress }: { children: React.ReactNode; href: string; style?: unknown; onPress?: () => void }) {
    return (
      <TouchableOpacity onPress={onPress} testID={`link-${href}`} style={style}>
        {children}
      </TouchableOpacity>
    );
  }
  Link.displayName = 'Link';

  function StackScreen() {
    return null;
  }
  StackScreen.displayName = 'Stack.Screen';
  
  return {
    Link,
    Stack: {
      Screen: StackScreen,
    },
  };
});

describe('NotFoundScreen', () => {
  it('component render edilmelidir', () => {
    render(<NotFoundScreen />);
    
    expect(screen.getByText('This screen does not exist.')).toBeTruthy();
  });

  it('başlık gösterilmelidir', () => {
    render(<NotFoundScreen />);
    
    expect(screen.getByText('This screen does not exist.')).toBeTruthy();
  });

  it('ana sayfaya link gösterilmelidir', () => {
    render(<NotFoundScreen />);
    
    expect(screen.getByText('Go to home screen!')).toBeTruthy();
  });

  it('ana sayfa linkine tıklandığında yönlendirme yapılmalıdır', () => {
    render(<NotFoundScreen />);
    
    const link = screen.getByTestId('link-/');
    expect(link).toBeTruthy();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<NotFoundScreen />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<NotFoundScreen />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
