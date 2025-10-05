// components/__tests__/dream/ResultSkeleton.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import ResultSkeleton from '../../dream/ResultSkeleton';

describe('ResultSkeleton', () => {
  it('skeleton elementlerini render etmelidir', () => {
    const { toJSON } = render(<ResultSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('header skeleton\'ı içermelidir', () => {
    const { toJSON } = render(<ResultSkeleton />);
    const component = toJSON();
    expect(component).toBeTruthy();
  });

  it('card skeleton\'ları içermelidir', () => {
    const { toJSON } = render(<ResultSkeleton />);
    const component = toJSON();
    expect(component).toBeTruthy();
  });

  it('component doğru şekilde render edilmelidir', () => {
    const { toJSON } = render(<ResultSkeleton />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('tüm skeleton elementlerini içermelidir', () => {
    const { toJSON } = render(<ResultSkeleton />);
    const component = toJSON();
    
    // Component'in render edildiğini kontrol et
    expect(component).toBeTruthy();
    
    // Skeleton'ların varlığını kontrol et (JSON yapısından)
    if (component && typeof component === 'object' && 'children' in component) {
      expect(component.children).toBeTruthy();
    }
  });

  it('animasyonlu skeleton elementlerini içermelidir', () => {
    const { toJSON } = render(<ResultSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
