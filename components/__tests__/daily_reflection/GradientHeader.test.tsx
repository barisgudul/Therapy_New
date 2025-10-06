// components/__tests__/daily_reflection/GradientHeader.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { GradientHeader } from '../../../components/daily_reflection/GradientHeader';

jest.mock('@react-native-masked-view/masked-view', () => {
  const MockMaskedView = ({ children }: any) => <>{children}</>;
  MockMaskedView.displayName = 'MockMaskedView';
  return MockMaskedView;
});

describe('GradientHeader', () => {
  it('metni render eder', () => {
    const { toJSON } = render(
      <GradientHeader text="Başlık" colors={["#000", "#111"]} />
    );
    expect(toJSON()).toBeTruthy();
  });
});


