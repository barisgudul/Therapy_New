// components/__tests__/home/HomeHeader.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HomeHeader } from '../../home/HomeHeader';

describe('HomeHeader', () => {
  it('marka adını gösterir', () => {
    render(<HomeHeader onSettingsPress={jest.fn()} />);
    expect(screen.getByText('Gisbel.')).toBeTruthy();
  });

  it('ayarlar butonuna basınca onSettingsPress çağrılır', () => {
    const onSettingsPress = jest.fn();
    render(<HomeHeader onSettingsPress={onSettingsPress} />);
    
    const settingsButton = screen.getByTestId('settings-button');
    fireEvent.press(settingsButton);
    expect(onSettingsPress).toHaveBeenCalled();
  });
});
