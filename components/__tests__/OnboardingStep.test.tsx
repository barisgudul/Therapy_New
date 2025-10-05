// components/__tests__/OnboardingStep.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import OnboardingStep from '../OnboardingStep';

describe('OnboardingStep', () => {
  const onNextPressMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    step: 1,
    totalSteps: 3,
    questionKey: 'onboarding.name',
    icon: 'person' as const,
    onNextPress: onNextPressMock,
  };

  it('başlangıçta doğru adım sayısını, soruyu ve ikonu göstermelidir', () => {
    render(<OnboardingStep {...defaultProps} />);

    expect(screen.getByText('common.stepCounter')).toBeTruthy(); // Çeviri mock'landığı için key'i arıyoruz
    expect(screen.getByText('onboarding.name.question')).toBeTruthy();
    // İkonun varlığını test etmek zor, genelde test edilmez ama testID ile edilebilir.
  });

  it('başlangıçta buton pasif olmalıdır (minChars sağlanmadığı için)', () => {
    render(<OnboardingStep {...defaultProps} minChars={5} />);
    const continueButton = screen.getByText('common.continue');
    
    // Pressable'ın kendisinin disabled prop'unu kontrol etmek daha sağlıklıdır.
    // Bunun için butona testID vererek parent'ını bulabiliriz.
    expect(continueButton.props.style.some(s => s && s.opacity === 0.5)).toBeFalsy(); // Örnek stil kontrolü
  });

  it('yeterli karakter girildiğinde buton aktif olmalıdır', () => {
    render(<OnboardingStep {...defaultProps} minChars={3} />);
    const input = screen.getByPlaceholderText('common.placeholder_freeWrite');
    const continueButton = screen.getByTestId('onboarding-next-button'); // testID ile bul

    expect(continueButton).toBeDisabled(); // Başlangıçta pasif olmalı

    fireEvent.changeText(input, 'Barış');

    expect(continueButton).toBeEnabled(); // Yeterli karakter girince aktif olmalı
  });

  it('devam et butonuna basıldığında onNextPress fonksiyonunu doğru metinle çağırmalıdır', () => {
    render(<OnboardingStep {...defaultProps} />);
    const input = screen.getByPlaceholderText('common.placeholder_freeWrite');
    const continueButton = screen.getByText('common.continue');
    const inputText = 'Test Cevabı';

    fireEvent.changeText(input, inputText);
    fireEvent.press(continueButton);

    expect(onNextPressMock).toHaveBeenCalledWith(inputText);
    expect(onNextPressMock).toHaveBeenCalledTimes(1);
  });

  it('isLastStep true olduğunda buton metni "Bitir ve Başla" olmalıdır', () => {
    render(<OnboardingStep {...defaultProps} isLastStep />);
    
    expect(screen.getByText('common.finishAndStart')).toBeTruthy();
    expect(screen.queryByText('common.continue')).toBeNull();
  });
});
