// components/__tests__/daily_reflection/GradientMood.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { GradientMoodImage } from '../../../components/daily_reflection/GradientMoodImage';
import { GradientMoodLabel } from '../../../components/daily_reflection/GradientMoodLabel';

jest.mock('@react-native-masked-view/masked-view', () => {
  const MockMaskedView = ({ children }: any) => <>{children}</>;
  MockMaskedView.displayName = 'MockMaskedView';
  return MockMaskedView;
});

describe('GradientMood components', () => {
  it('GradientMoodImage render eder', () => {
    const { toJSON } = render(
      <GradientMoodImage colors={["#000", "#111"]} moodValue={3} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('GradientMoodLabel render eder', () => {
    const { toJSON } = render(
      <GradientMoodLabel text="Neşeli" colors={["#000", "#111"]} />
    );
    expect(toJSON()).toBeTruthy();
  });
});


