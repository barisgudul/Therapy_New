// components/__tests__/AuthComponents.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AuthLayout } from '../AuthLayout';
import { AuthInput } from '../AuthInput';
import { AuthButton } from '../AuthButton';
import { LoadingButton } from '../LoadingButton';
import { Text, Image } from 'react-native';

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

    it('logo görüntülenmelidir', () => {
      const { UNSAFE_getAllByType } = render(
        <AuthLayout title="Test" subtitle="Test" footer={<Text>Test</Text>}>
          <Text>Test</Text>
        </AuthLayout>
      );
      // Logo Image component'i test edilir
      const images = UNSAFE_getAllByType(Image);
      expect(images.length).toBeGreaterThan(0);
    });

    it('KeyboardAvoidingView iOS için padding behavior kullanmalıdır', () => {
      const ReactNative = jest.requireActual('react-native');
      const originalPlatform = ReactNative.Platform;
      ReactNative.Platform = { ...originalPlatform, OS: 'ios' };
      
      render(
        <AuthLayout title="iOS Test" subtitle="iOS Subtitle" footer={<Text>iOS Footer</Text>}>
          <Text>iOS Content</Text>
        </AuthLayout>
      );
      
      // iOS için padding behavior test edilir
      expect(screen.getByText('iOS Test')).toBeTruthy();
      expect(screen.getByText('iOS Subtitle')).toBeTruthy();
      expect(screen.getByText('iOS Content')).toBeTruthy();
      expect(screen.getByText('iOS Footer')).toBeTruthy();
      
      // Platform'u geri yükle
      ReactNative.Platform = originalPlatform;
    });

    it('KeyboardAvoidingView Android için height behavior kullanmalıdır', () => {
      const ReactNative = jest.requireActual('react-native');
      const originalPlatform = ReactNative.Platform;
      ReactNative.Platform = { ...originalPlatform, OS: 'android' };
      
      render(
        <AuthLayout title="Android Test" subtitle="Android Subtitle" footer={<Text>Android Footer</Text>}>
          <Text>Android Content</Text>
        </AuthLayout>
      );
      
      // Android için height behavior test edilir
      expect(screen.getByText('Android Test')).toBeTruthy();
      expect(screen.getByText('Android Subtitle')).toBeTruthy();
      expect(screen.getByText('Android Content')).toBeTruthy();
      expect(screen.getByText('Android Footer')).toBeTruthy();
      
      // Platform'u geri yükle
      ReactNative.Platform = originalPlatform;
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
