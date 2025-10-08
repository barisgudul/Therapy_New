// hooks/__tests__/useColorScheme.test.tsx
import { useColorScheme } from '../useColorScheme';

describe('useColorScheme', () => {
  it('react-native useColorScheme re-export edilmelidir', () => {
    // Bu sadece re-export olduğu için import edebilmemiz yeterli
    expect(useColorScheme).toBeDefined();
    expect(typeof useColorScheme).toBe('function');
  });

  it('fonksiyon olarak çalışabilmelidir', () => {
    // Re-export edilmiş fonksiyon kullanılabilir olmalı
    expect(typeof useColorScheme).toBe('function');
  });
});

