// components/__tests__/ProcessingScreen.test.tsx
import React from 'react';
import { render, screen, act} from '@testing-library/react-native';
import ProcessingScreen from '../ProcessingScreen';

jest.useFakeTimers();

describe('ProcessingScreen', () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('verilen metni doğru bir şekilde göstermelidir', () => {
    const testText = 'Analiz ediliyor...';
    render(<ProcessingScreen text={testText} onComplete={() => {}} />);
    expect(screen.getByText(testText)).toBeTruthy();
  });

  it('animasyon süresi dolduğunda onComplete fonksiyonunu çağırmalıdır', () => {
    const onCompleteMock = jest.fn();
    const animationDuration = 1500;

    render(<ProcessingScreen text="İşleniyor" onComplete={onCompleteMock} />);
    expect(onCompleteMock).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(animationDuration);
    });

    expect(onCompleteMock).toHaveBeenCalledTimes(1);
  });

  it('farklı metinlerle çalışmalıdır', () => {
    const testCases = [
      'Rüya analiz ediliyor...',
      'AI düşünüyor...',
      'Rapor hazırlanıyor...'
    ];

    testCases.forEach((text) => {
      const { unmount } = render(<ProcessingScreen text={text} onComplete={() => {}} />);
      expect(screen.getByText(text)).toBeTruthy();
      unmount();
      jest.clearAllTimers(); // Clear timers after each unmount
    });
  });

  it('component unmount edildiğinde timer\'lar temizlenmelidir', () => {
    const onCompleteMock = jest.fn();
    const { unmount } = render(<ProcessingScreen text="Test" onComplete={onCompleteMock} />);

    // Unmount before timer completes
    act(() => {
      unmount();
    });

    // Clear any pending timers immediately after unmount
    jest.clearAllTimers();

    // Now advance time - onComplete should NOT be called
    act(() => {
      jest.runAllTimers();
    });

    expect(onCompleteMock).not.toHaveBeenCalled();
  });
});
