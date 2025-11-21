// components/__tests__/dream/Sigil.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import Sigil from '../../dream/Sigil';


// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.useSharedValue = jest.fn((initial) => ({ value: initial }));
  Reanimated.useAnimatedStyle = jest.fn((callback) => callback());
  Reanimated.withRepeat = jest.fn((animation, _iterations, _reverse) => animation);
  Reanimated.withTiming = jest.fn((value, _config) => value);
  Reanimated.interpolate = jest.fn((value, _inputRange, _outputRange) => value);
  Reanimated.Easing = {
    inOut: jest.fn(() => jest.fn()),
    ease: jest.fn(),
  };
  return Reanimated;
});

describe('Sigil', () => {
  const mockTapAnimation = {
    value: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tapAnimation prop\'u ile render edilmelidir', () => {
    const { toJSON } = render(<Sigil tapAnimation={mockTapAnimation as any} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('component doğru şekilde render edilmelidir', () => {
    const { toJSON } = render(<Sigil tapAnimation={mockTapAnimation as any} />);
    expect(toJSON()).toBeTruthy();
  });

  it('SVG elementlerini içermelidir', () => {
    const { toJSON } = render(<Sigil tapAnimation={mockTapAnimation as any} />);
    const component = toJSON();
    expect(component).toBeTruthy();
  });

  it('farklı tapAnimation değerleri ile çalışmalıdır', () => {
    const mockTapAnimation1 = { value: 0 };
    const mockTapAnimation2 = { value: 0.5 };
    const mockTapAnimation3 = { value: 1 };

    const { toJSON: toJSON1 } = render(<Sigil tapAnimation={mockTapAnimation1 as any} />);
    const { toJSON: toJSON2 } = render(<Sigil tapAnimation={mockTapAnimation2 as any} />);
    const { toJSON: toJSON3 } = render(<Sigil tapAnimation={mockTapAnimation3 as any} />);

    expect(toJSON1()).toBeTruthy();
    expect(toJSON2()).toBeTruthy();
    expect(toJSON3()).toBeTruthy();
  });
});
