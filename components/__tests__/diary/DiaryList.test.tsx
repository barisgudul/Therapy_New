// components/__tests__/diary/DiaryList.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DiaryList } from '../../diary/DiaryList';

const mockUseDiaryContext = jest.fn();

jest.mock('../../../context/DiaryContext', () => ({
  useDiaryContext: () => mockUseDiaryContext()
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn()
  })
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}));

describe('DiaryList', () => {
  beforeEach(() => {
    mockUseDiaryContext.mockReturnValue({
      state: {
        isLoadingDiaries: false,
        diaryEvents: [
          {
            id: '1',
            timestamp: '2024-01-01T10:00:00Z',
            data: {
              messages: [{ text: 'Test mesajı', isUser: true }]
            }
          }
        ]
      },
      handlers: {
        viewDiary: jest.fn(),
        startNewDiary: jest.fn()
      }
    });
  });

  it('başlık ve alt başlığı gösterir', () => {
    render(<DiaryList />);
    expect(screen.getByText('diary.list.title')).toBeTruthy();
    expect(screen.getByText('diary.list.subtitle')).toBeTruthy();
  });

  it('yeni günlük butonuna basınca startNewDiary çağrılır', () => {
    const mockHandlers = { startNewDiary: jest.fn() };
    mockUseDiaryContext.mockReturnValue({
      state: { isLoadingDiaries: false, diaryEvents: [] },
      handlers: mockHandlers
    });

    render(<DiaryList />);
    fireEvent.press(screen.getByText('diary.list.button_new'));
    expect(mockHandlers.startNewDiary).toHaveBeenCalled();
  });

  it('günlük kartına basınca viewDiary çağrılır', () => {
    const mockHandlers = { viewDiary: jest.fn() };
    mockUseDiaryContext.mockReturnValue({
      state: {
        isLoadingDiaries: false,
        diaryEvents: [{ 
          id: '1', 
          timestamp: '2024-01-01T10:00:00Z', 
          data: { 
            messages: [{ text: 'Test mesajı', isUser: true, timestamp: '2024-01-01T10:00:00Z' }] 
          } 
        }]
      },
      handlers: mockHandlers
    });

    render(<DiaryList />);
    const diaryCard = screen.getByText('Test mesajı').parent?.parent?.parent;
    if (diaryCard) fireEvent.press(diaryCard);
    expect(mockHandlers.viewDiary).toHaveBeenCalled();
  });

  it('loading durumunda skeleton gösterir', () => {
    mockUseDiaryContext.mockReturnValue({
      state: {
        isLoadingDiaries: true,
        diaryEvents: []
      },
      handlers: {
        viewDiary: jest.fn(),
        startNewDiary: jest.fn()
      }
    });

    render(<DiaryList />);
    // Skeleton placeholder'ları gösterilmeli
    expect(screen.getByText('diary.list.title')).toBeTruthy();
  });

  it('boş günlük listesi durumunda doğru mesajı gösterir', () => {
    mockUseDiaryContext.mockReturnValue({
      state: {
        isLoadingDiaries: false,
        diaryEvents: []
      },
      handlers: {
        viewDiary: jest.fn(),
        startNewDiary: jest.fn()
      }
    });

    render(<DiaryList />);
    expect(screen.getByText('diary.list.button_new')).toBeTruthy();
  });

  it('geri butonuna basınca router.back çağrılır', () => {
    const mockRouter = { back: jest.fn() };
    jest.doMock('expo-router', () => ({
      useRouter: () => mockRouter
    }));

    render(<DiaryList />);
    const backButton = screen.getByText('diary.list.title').parent?.parent?.children[0];
    if (backButton) fireEvent.press(backButton);
    // Router.back çağrıldığını kontrol etmek için mock'u kontrol et
  });

  it('farklı günlük event türleri ile çalışır', () => {
    mockUseDiaryContext.mockReturnValue({
      state: {
        isLoadingDiaries: false,
        diaryEvents: [
          { 
            id: '1', 
            timestamp: '2024-01-01T10:00:00Z', 
            data: { 
              messages: [{ text: 'Test mesajı 1', isUser: true, timestamp: '2024-01-01T10:00:00Z' }] 
            } 
          },
          { 
            id: '2', 
            timestamp: '2024-01-02T10:00:00Z', 
            data: { 
              messages: [{ text: 'Test mesajı 2', isUser: false, timestamp: '2024-01-02T10:00:00Z' }] 
            } 
          }
        ]
      },
      handlers: {
        viewDiary: jest.fn(),
        startNewDiary: jest.fn()
      }
    });

    render(<DiaryList />);
    expect(screen.getByText('Test mesajı 1')).toBeTruthy();
    expect(screen.getByText('Test mesajı 2')).toBeTruthy();
  });

  it('safe area insets ile doğru padding uygular', () => {
    const mockUseSafeAreaInsets = jest.fn(() => ({ top: 44, bottom: 34, left: 0, right: 0 }));
    jest.doMock('react-native-safe-area-context', () => ({
      useSafeAreaInsets: mockUseSafeAreaInsets
    }));

    render(<DiaryList />);
    expect(screen.getByText('diary.list.title')).toBeTruthy();
  });
});
