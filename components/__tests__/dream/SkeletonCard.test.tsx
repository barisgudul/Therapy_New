// components/__tests__/dream/SkeletonCard.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import SkeletonCard from '../../dream/SkeletonCard';

describe('SkeletonCard', () => {
  it('varsayılan delay ile render edilmelidir', () => {
    const { toJSON } = render(<SkeletonCard />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('özel delay ile render edilmelidir', () => {
    const { toJSON } = render(<SkeletonCard delay={2} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('skeleton elementlerini içermelidir', () => {
    const { toJSON } = render(<SkeletonCard />);
    const tree = toJSON();
    
    // Skeleton elementlerini test et - component render edilmiş olmalı
    expect(tree).toBeTruthy();
    expect(tree?.children).toBeTruthy();
  });

  it('farklı delay değerleri ile çalışmalıdır', () => {
    const { toJSON: toJSON1 } = render(<SkeletonCard delay={0} />);
    const { toJSON: toJSON2 } = render(<SkeletonCard delay={1} />);
    const { toJSON: toJSON3 } = render(<SkeletonCard delay={3} />);
    
    expect(toJSON1()).toBeTruthy();
    expect(toJSON2()).toBeTruthy();
    expect(toJSON3()).toBeTruthy();
  });

  it('component doğru şekilde render edilmelidir', () => {
    const { toJSON } = render(<SkeletonCard delay={1} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
