// components/__tests__/AuthComponents.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AuthLayout } from '../AuthLayout';
import { AuthInput } from '../AuthInput';
import { AuthButton } from '../AuthButton';
import { LoadingButton } from '../LoadingButton';
import { Text } from 'react-native';

describe('Auth Components', () => {

  describe('AuthLayout', () => {
    it('title, subtitle, children ve footer\'ı doğru render etmelidir', () => {
      render(
        <AuthLayout title="Giriş Yap" subtitle="Hesabına eriş" footer={<Text>Hesabın yok mu?</Text>}>
          <Text>İçerik</Text>
        </AuthLayout>
      );
      expect(screen.getByText('Giriş Yap')).toBeTruthy();
      expect(screen.getByText('Hesabına eriş')).toBeTruthy();
      expect(screen.getByText('İçerik')).toBeTruthy();
      expect(screen.getByText('Hesabın yok mu?')).toBeTruthy();
    });
  });

  describe('AuthInput', () => {
    it('verilen placeholder\'ı göstermeli ve metin girişine izin vermeli', () => {
      const onChangeTextMock = jest.fn(); // Mock fonksiyonu oluştur
      render(
        <AuthInput 
          iconName="mail" 
          placeholder="E-posta" 
          onChangeText={onChangeTextMock} // Mock'u prop olarak ver
        />
      );
      
      const input = screen.getByPlaceholderText('E-posta');
      fireEvent.changeText(input, 'test@mail.com');
      
      // 'value' yerine, 'onChangeText'in doğru argümanla çağrılıp çağrılmadığını kontrol et
      expect(onChangeTextMock).toHaveBeenCalledWith('test@mail.com');
    });
  });

  describe('AuthButton', () => {
    it('verilen metni göstermeli ve tıklandığında onPress\'i çağırmalıdır', () => {
      const onPressMock = jest.fn();
      render(<AuthButton text="Giriş" onPress={onPressMock} />);
      const button = screen.getByText('Giriş');
      fireEvent.press(button);
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('isLoading true ise ActivityIndicator göstermeli ve pasif olmalıdır', () => {
      render(<AuthButton text="Giriş" onPress={() => {}} isLoading />);
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
      expect(screen.queryByText('Giriş')).toBeNull();
    });
  });
  
  describe('LoadingButton', () => {
    it('isLoading false ise metni göstermelidir', () => {
      render(<LoadingButton text="Yükle" isLoading={false} />);
      expect(screen.getByText('Yükle')).toBeTruthy();
    });
    
    it('isLoading true ise ActivityIndicator göstermelidir', () => {
      render(<LoadingButton text="Yükle" isLoading />);
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
      expect(screen.queryByText('Yükle')).toBeNull();
    });
  });
});
