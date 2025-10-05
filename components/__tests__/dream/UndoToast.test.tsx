// components/__tests__/dream/UndoToast.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import UndoToast from '../../dream/UndoToast';

describe('UndoToast', () => {
  const onUndoMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('başlık ve alt başlığı doğru şekilde göstermelidir', () => {
    render(<UndoToast onUndo={onUndoMock} />);
    
    expect(screen.getByText('dream.components.undoToast.title')).toBeTruthy();
    expect(screen.getByText('dream.components.undoToast.subtitle')).toBeTruthy();
  });

  it('undo butonunu göstermelidir', () => {
    render(<UndoToast onUndo={onUndoMock} />);
    
    expect(screen.getByText('dream.components.undoToast.undo')).toBeTruthy();
  });

  it('undo butonuna basıldığında onUndo fonksiyonunu çağırmalıdır', () => {
    render(<UndoToast onUndo={onUndoMock} />);
    
    const undoButton = screen.getByText('dream.components.undoToast.undo');
    fireEvent.press(undoButton);
    
    expect(onUndoMock).toHaveBeenCalledTimes(1);
  });

  it('component doğru şekilde render edilmelidir', () => {
    const { toJSON } = render(<UndoToast onUndo={onUndoMock} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
