// components/__tests__/ui/IconSymbol.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { IconSymbol } from '../../ui/IconSymbol';

// Mock expo-symbols for testing
jest.mock('expo-symbols', () => ({
  SymbolView: ({ name: _name, size: _size, color: _color, style: _style }: any) => null,
}));

describe('IconSymbol', () => {
  it('varsayılan props ile render eder', () => {
    const { toJSON } = render(
      <IconSymbol name="house.fill" color="#000000" />
    );
    expect(toJSON()).toBeNull();
  });

  it('özel size ve color ile render eder', () => {
    const { toJSON } = render(
      <IconSymbol 
        name="paperplane.fill" 
        color="#FF0000" 
        size={32}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('style prop ile render eder', () => {
    const customStyle = { marginTop: 10 };
    const { toJSON } = render(
      <IconSymbol 
        name="chevron.right" 
        color="#000000" 
        style={customStyle}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('weight prop ile render eder', () => {
    const { toJSON } = render(
      <IconSymbol 
        name="house.fill" 
        color="#000000" 
        weight="bold"
      />
    );
    expect(toJSON()).toBeNull();
  });
});
