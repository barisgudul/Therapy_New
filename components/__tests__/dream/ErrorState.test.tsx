// components/__tests__/dream/ErrorState.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ErrorState from '../../dream/ErrorState';

// useRouter mock
const mockRouter = {
  back: jest.fn(),
};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

describe('ErrorState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verilen error mesajını göstermelidir', () => {
    const errorMessage = 'Bir hata oluştu';
    render(<ErrorState message={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeTruthy();
  });

  it('varsayılan olarak geri butonunu göstermelidir', () => {
    const errorMessage = 'Test error';
    render(<ErrorState message={errorMessage} />);
    
    expect(screen.getByText('dream.components.errorState.back')).toBeTruthy();
  });

  it('showBackButton false olduğunda geri butonunu göstermemelidir', () => {
    const errorMessage = 'Test error';
    render(<ErrorState message={errorMessage} showBackButton={false} />);
    
    expect(screen.queryByText('dream.components.errorState.back')).toBeNull();
  });

  it('geri butonuna basıldığında router.back çağrılmalıdır', () => {
    const errorMessage = 'Test error';
    render(<ErrorState message={errorMessage} />);
    
    const backButton = screen.getByText('dream.components.errorState.back');
    fireEvent.press(backButton);
    
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('component doğru şekilde render edilmelidir', () => {
    const errorMessage = 'Test error';
    const { toJSON } = render(<ErrorState message={errorMessage} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
