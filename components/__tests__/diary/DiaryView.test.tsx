// components/__tests__/diary/DiaryView.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DiaryView } from '../../diary/DiaryView';

const mockUseDiaryContext = jest.fn();

jest.mock('../../../context/DiaryContext', () => ({
  useDiaryContext: () => mockUseDiaryContext()
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}));

describe('DiaryView', () => {
  beforeEach(() => {
    mockUseDiaryContext.mockReturnValue({
      state: {
        selectedDiary: {
          id: '1',
          timestamp: '2024-01-01T10:00:00Z',
          data: {
            messages: [
              { text: 'Kullanıcı mesajı', isUser: true, timestamp: '2024-01-01T10:00:00Z' },
              { text: 'AI mesajı', isUser: false, timestamp: '2024-01-01T10:01:00Z' }
            ]
          }
        }
      },
      handlers: {
        exitView: jest.fn(),
        deleteDiary: jest.fn()
      }
    });
  });

  it('seçili günlük yoksa loading gösterir', () => {
    mockUseDiaryContext.mockReturnValue({
      state: { selectedDiary: null },
      handlers: { exitView: jest.fn(), deleteDiary: jest.fn() }
    });

    render(<DiaryView />);
    expect(screen.getByText('diary.view.loading')).toBeTruthy();
  });

  it('günlük mesajlarını gösterir', () => {
    render(<DiaryView />);
    expect(screen.getByText('Kullanıcı mesajı')).toBeTruthy();
    expect(screen.getByText('AI mesajı')).toBeTruthy();
  });

  it('geri butonuna basınca exitView çağrılır', () => {
    const mockHandlers = { exitView: jest.fn(), deleteDiary: jest.fn() };
    mockUseDiaryContext.mockReturnValue({
      state: { selectedDiary: { id: '1', timestamp: '2024-01-01T10:00:00Z', data: { messages: [] } } },
      handlers: mockHandlers
    });

    render(<DiaryView />);
    const backButton = screen.getByTestId('back-button');
    fireEvent.press(backButton);
    expect(mockHandlers.exitView).toHaveBeenCalled();
  });

  it('sil butonuna basınca deleteDiary çağrılır', () => {
    const mockHandlers = { exitView: jest.fn(), deleteDiary: jest.fn() };
    mockUseDiaryContext.mockReturnValue({
      state: { selectedDiary: { id: '1', timestamp: '2024-01-01T10:00:00Z', data: { messages: [] } } },
      handlers: mockHandlers
    });

    render(<DiaryView />);
    const deleteButton = screen.getByTestId('delete-button');
    fireEvent.press(deleteButton);
    expect(mockHandlers.deleteDiary).toHaveBeenCalledWith('1');
  });
});
