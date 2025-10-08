// app/(guest)/__tests__/step3.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import Step3 from '../step3';

// Mock'lar
jest.mock('../../../components/OnboardingStep', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ step, questionKey, onNextPress, isLastStep, icon, minChars }: { 
      step: number; 
      questionKey: string; 
      onNextPress: (answer: string) => void; 
      isLastStep?: boolean;
      icon?: string;
      minChars?: number;
    }) => (
      <View testID="onboarding-step">
        <Text>{`${questionKey}.question`}</Text>
        <Text>{`Step ${step} of 3`}</Text>
        {isLastStep && <Text testID="is-last-step">Last Step</Text>}
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
jest.mock('../../../services/api.service');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
jest.mock('expo-router/', () => ({
  useRouter: jest.fn(),
}));

describe('Step3', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockUseOnboardingStore = jest.mocked(require('../../../store/onboardingStore').useOnboardingStore);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock'lar
    mockUseRouter.mockReturnValue({
      replace: jest.fn(),
    });

    mockUseOnboardingStore.mockImplementation((selector) => {
      const state = {
        setAnswer: jest.fn(),
        setMode: jest.fn(),
        setTrial: jest.fn(),
        setRecallAt: jest.fn(),
      };
      return selector(state);
    });
  });

  it('component render edilmelidir', () => {
    render(<Step3 />);
    
    expect(screen.getByTestId('onboarding-step')).toBeTruthy();
  });

  it('soru metni gösterilmelidir', () => {
    render(<Step3 />);
    
    expect(screen.getByText('onboarding_step3.question')).toBeTruthy();
  });

  it('adım bilgisi gösterilmelidir', () => {
    render(<Step3 />);
    
    expect(screen.getByText('Step 3 of 3')).toBeTruthy();
  });

  it('son adım işareti gösterilmelidir', () => {
    render(<Step3 />);
    
    expect(screen.getByText('Last Step')).toBeTruthy();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<Step3 />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<Step3 />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('next fonksiyonu çağrıldığında setAnswer, setMode, logEvent ve router.replace çalışmalıdır', async () => {
    const mockReplace = jest.fn();
    const mockSetAnswer = jest.fn();
    const mockSetMode = jest.fn();
    const mockLogEvent = jest.fn().mockResolvedValue(undefined);
    
    mockUseRouter.mockReturnValue({
      replace: mockReplace,
    });

    mockUseOnboardingStore.mockImplementation((selector) => {
      const state = {
        setAnswer: mockSetAnswer,
        setMode: mockSetMode,
        setTrial: jest.fn(),
        setRecallAt: jest.fn(),
      };
      return selector(state);
    });

    const mockApiService = require('../../../services/api.service');
    mockApiService.logEvent = mockLogEvent;

    render(<Step3 />);
    
    const nextButton = screen.getByTestId('next-button');
    fireEvent.press(nextButton);
    
    expect(mockSetAnswer).toHaveBeenCalledWith(3, 'onboarding_step3.question', 'Test answer');
    expect(mockSetMode).toHaveBeenCalledWith('InstantReport');
    expect(mockLogEvent).toHaveBeenCalledWith({
      type: 'guest_start',
      data: {},
    });
    expect(mockReplace).toHaveBeenCalledWith('/(guest)/softwall');
  });

  it('isLastStep prop true olmalıdır', () => {
    render(<Step3 />);
    
    expect(screen.getByTestId('is-last-step')).toBeTruthy();
  });

  it('icon prop doğru şekilde iletilmelidir', () => {
    render(<Step3 />);
    
    expect(screen.getByTestId('icon')).toBeTruthy();
    expect(screen.getByText('star-outline')).toBeTruthy();
  });

  it('minChars prop doğru şekilde iletilmelidir', () => {
    render(<Step3 />);
    
    expect(screen.getByTestId('minChars')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
  });
});
