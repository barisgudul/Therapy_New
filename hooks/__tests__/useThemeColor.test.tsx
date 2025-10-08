// hooks/__tests__/useThemeColor.test.tsx
import { renderHook } from '@testing-library/react-native';
import { useThemeColor } from '../useThemeColor';
import { Colors } from '../../constants/Colors';

// Mock useColorScheme
jest.mock('../useColorScheme', () => ({
  useColorScheme: jest.fn(),
}));

describe('useThemeColor', () => {
  const mockUseColorScheme = jest.mocked(require('../useColorScheme').useColorScheme);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('light teması için props değerini döndürmelidir', () => {
    mockUseColorScheme.mockReturnValue('light');

    const { result } = renderHook(() =>
      useThemeColor({ light: '#ffffff', dark: '#000000' }, 'background')
    );

    expect(result.current).toBe('#ffffff');
  });

  it('dark teması için props değerini döndürmelidir', () => {
    mockUseColorScheme.mockReturnValue('dark');

    const { result } = renderHook(() =>
      useThemeColor({ light: '#ffffff', dark: '#000000' }, 'background')
    );

    expect(result.current).toBe('#000000');
  });

  it('props yoksa light tema için Colors değerini döndürmelidir', () => {
    mockUseColorScheme.mockReturnValue('light');

    const { result } = renderHook(() =>
      useThemeColor({}, 'background')
    );

    expect(result.current).toBe(Colors.light.background);
  });

  it('props yoksa dark tema için Colors değerini döndürmelidir', () => {
    mockUseColorScheme.mockReturnValue('dark');

    const { result } = renderHook(() =>
      useThemeColor({}, 'background')
    );

    expect(result.current).toBe(Colors.dark.background);
  });

  it('useColorScheme null döndüğünde light teması varsayılan olmalıdır', () => {
    mockUseColorScheme.mockReturnValue(null);

    const { result } = renderHook(() =>
      useThemeColor({}, 'background')
    );

    expect(result.current).toBe(Colors.light.background);
  });

  it('sadece light prop verildiğinde dark tema için Colors değerini kullanmalıdır', () => {
    mockUseColorScheme.mockReturnValue('dark');

    const { result } = renderHook(() =>
      useThemeColor({ light: '#ffffff' }, 'background')
    );

    expect(result.current).toBe(Colors.dark.background);
  });

  it('sadece dark prop verildiğinde light tema için Colors değerini kullanmalıdır', () => {
    mockUseColorScheme.mockReturnValue('light');

    const { result } = renderHook(() =>
      useThemeColor({ dark: '#000000' }, 'background')
    );

    expect(result.current).toBe(Colors.light.background);
  });

  it('farklı color name değerleri için doğru renkleri döndürmelidir', () => {
    mockUseColorScheme.mockReturnValue('light');

    const { result: result1 } = renderHook(() =>
      useThemeColor({}, 'text')
    );
    expect(result1.current).toBe(Colors.light.text);

    const { result: result2 } = renderHook(() =>
      useThemeColor({}, 'tint')
    );
    expect(result2.current).toBe(Colors.light.tint);
  });
});

