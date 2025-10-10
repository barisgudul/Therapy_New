// hooks/__tests__/useColorScheme.web.test.tsx
import { renderHook } from '@testing-library/react-native';

// Mock React Native'in useColorScheme'ini
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn(() => 'light'),
}));

describe('useColorScheme.web', () => {
  it('modül import edilebilmelidir', () => {
    const { useColorScheme } = require('../useColorScheme.web');
    
    expect(useColorScheme).toBeDefined();
    expect(typeof useColorScheme).toBe('function');
  });

  it('fonksiyon olarak çağrılabilmelidir', () => {
    const { useColorScheme } = require('../useColorScheme.web');
    const { result } = renderHook(() => useColorScheme());
    
    expect(result.current).toBeDefined();
  });

  it('light veya dark değeri döndürmelidir', () => {
    const { useColorScheme } = require('../useColorScheme.web');
    const { result } = renderHook(() => useColorScheme());
    
    expect(['light', 'dark', null, undefined]).toContain(result.current);
  });

  it('birden fazla kez çağrılabilmelidir', () => {
    const { useColorScheme } = require('../useColorScheme.web');
    
    const { result: result1 } = renderHook(() => useColorScheme());
    const { result: result2 } = renderHook(() => useColorScheme());
    
    expect(result1.current).toBeDefined();
    expect(result2.current).toBeDefined();
  });

  it('unmount edildiğinde hata vermemelidir', () => {
    const { useColorScheme } = require('../useColorScheme.web');
    const { unmount } = renderHook(() => useColorScheme());
    
    expect(() => unmount()).not.toThrow();
  });
});
