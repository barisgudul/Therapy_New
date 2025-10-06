// components/__tests__/home/ActionButton.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ActionButton } from '../../home/ActionButton';

describe('ActionButton', () => {
  it('metin ve ikonu gösterir', () => {
    render(<ActionButton onPress={jest.fn()} icon="heart" text="Test Button" />);
    expect(screen.getByText('Test Button')).toBeTruthy();
  });

  it('basıldığında onPress çağrılır', () => {
    const onPress = jest.fn();
    render(<ActionButton onPress={onPress} icon="heart" text="Test Button" />);
    fireEvent.press(screen.getByText('Test Button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('özel buton stili uygular', () => {
    const { toJSON } = render(
      <ActionButton onPress={jest.fn()} icon="heart" text="Special Button" isSpecial />
    );
    expect(toJSON()).toBeTruthy();
  });
});
