// app/(guest)/__tests__/step1.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import Step1 from '../step1';

// Mock'lar
jest.mock('../../../components/OnboardingStep', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ step, questionKey, onNextPress, icon, minChars }: { 
      step: number; 
      questionKey: string; 
      onNextPress: (answer: string) => void;
      icon?: string;
      minChars?: number;
    }) => (
      <View testID="onboarding-step">
        <Text>{`${questionKey}.question`}</Text>
        <Text>{`Step ${step} of 3`}</Text>
        {icon && <Text testID="icon">{icon}</Text>}
        {minChars && <Text testID="minChars">{minChars}</Text>}
        <TouchableOpacity 
          testID="next-button" 
          onPress={() => onNextPress('Test answer')}
        >
          <Text>Next</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});
jest.mock('../../../store/onboardingStore');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
jest.mock('expo-router/', () => ({
  useRouter: jest.fn(),
}));

describe('Step1', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockUseOnboardingStore = jest.mocked(require('../../../store/onboardingStore').useOnboardingStore);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock'lar
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
    });

    mockUseOnboardingStore.mockReturnValue(jest.fn());
  });

  it('component render edilmelidir', () => {
    render(<Step1 />);
    
    expect(screen.getByTestId('onboarding-step')).toBeTruthy();
  });

  it('soru metni gösterilmelidir', () => {
    render(<Step1 />);
    
    expect(screen.getByText('onboarding_step1.question')).toBeTruthy();
  });

  it('adım bilgisi gösterilmelidir', () => {
    render(<Step1 />);
    
    expect(screen.getByText('Step 1 of 3')).toBeTruthy();
  });

  it('OnboardingStep doğru props ile render edilmelidir', () => {
    render(<Step1 />);
    
    expect(screen.getByTestId('onboarding-step')).toBeTruthy();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<Step1 />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<Step1 />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('next fonksiyonu çağrıldığında setAnswer ve router.push çalışmalıdır', () => {
    const mockPush = jest.fn();
    const mockSetAnswer = jest.fn();
    
    mockUseRouter.mockReturnValue({
      push: mockPush,
    });

    mockUseOnboardingStore.mockReturnValue(mockSetAnswer);

    render(<Step1 />);
    
    const nextButton = screen.getByTestId('next-button');
    fireEvent.press(nextButton);
    
    expect(mockSetAnswer).toHaveBeenCalledWith(1, 'onboarding_step1.question', 'Test answer');
    expect(mockPush).toHaveBeenCalledWith('/(guest)/step2');
  });

  it('icon prop doğru şekilde iletilmelidir', () => {
    render(<Step1 />);
    
    expect(screen.getByTestId('icon')).toBeTruthy();
    expect(screen.getByText('flash-outline')).toBeTruthy();
  });

  it('minChars prop doğru şekilde iletilmelidir', () => {
    render(<Step1 />);
    
    expect(screen.getByTestId('minChars')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });
});
