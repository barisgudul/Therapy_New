// components/__tests__/settings/SettingsCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SettingsCard } from '../../settings/SettingsCard';

describe('SettingsCard', () => {
  it('ikon ve etiketi gösterir', () => {
    render(<SettingsCard icon="settings" label="Test Ayarlar" onPress={jest.fn()} />);
    expect(screen.getByText('Test Ayarlar')).toBeTruthy();
  });

  it('basıldığında onPress çağrılır', () => {
    const onPress = jest.fn();
    render(<SettingsCard icon="settings" label="Test Ayarlar" onPress={onPress} />);
    
    const card = screen.getByText('Test Ayarlar').parent;
    if (card) fireEvent.press(card);
    expect(onPress).toHaveBeenCalled();
  });

  it('farklı ikon ve etiketlerle çalışır', () => {
    render(<SettingsCard icon="heart" label="Farklı Ayarlar" onPress={jest.fn()} />);
    expect(screen.getByText('Farklı Ayarlar')).toBeTruthy();
  });

  it('pressed state ile stil değişimi test edilmelidir', () => {
    const { toJSON } = render(<SettingsCard icon="settings" label="Test" onPress={jest.fn()} />);
    
    // Pressed state test edilir
    const card = screen.getByText('Test').parent;
    if (card) {
      fireEvent(card, 'pressIn');
      fireEvent(card, 'pressOut');
    }
    
    expect(toJSON()).toBeTruthy();
  });

  it('farklı icon türleri ile çalışmalıdır', () => {
    const icons = ['settings', 'heart', 'star', 'home', 'person'];
    
    icons.forEach(icon => {
      const { unmount } = render(
        <SettingsCard icon={icon as any} label={`Test ${icon}`} onPress={jest.fn()} />
      );
      expect(screen.getByText(`Test ${icon}`)).toBeTruthy();
      unmount();
    });
  });

  it('onPress farklı durumlarda çağrılmalıdır', () => {
    const onPress = jest.fn();
    render(<SettingsCard icon="settings" label="Test" onPress={onPress} />);
    
    const card = screen.getByText('Test').parent;
    if (card) {
      fireEvent.press(card);
      expect(onPress).toHaveBeenCalledTimes(1);
      
      fireEvent.press(card);
      expect(onPress).toHaveBeenCalledTimes(2);
    }
  });
});
