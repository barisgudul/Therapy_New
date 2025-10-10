// context/__tests__/DiaryContext.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { DiaryProvider, useDiaryContext } from '../DiaryContext';

// useDiary hook'unu mock'la
jest.mock('../../hooks/useDiary', () => ({
  useDiary: jest.fn(() => ({
    state: {
      mode: 'list',
      isLoadingDiaries: false,
      diaryEvents: [],
      selectedDiary: null,
      userName: 'Test User',
      messages: [],
      isSubmitting: false,
      currentQuestions: [],
      isModalVisible: false,
      currentInput: '',
      activeQuestion: null,
      isConversationDone: false,
    },
    handlers: {
      startNewDiary: jest.fn(),
      viewDiary: jest.fn(),
      exitView: jest.fn(),
      openModal: jest.fn(),
      closeModal: jest.fn(),
      changeInput: jest.fn(),
      selectQuestion: jest.fn(),
      submitAnswer: jest.fn(),
      saveDiary: jest.fn(),
      deleteDiary: jest.fn(),
    },
  })),
}));

describe('DiaryContext', () => {
  it('children\'ı başarıyla render etmelidir', () => {
    const { getByText } = render(
      <DiaryProvider>
        <Text>Test Content</Text>
      </DiaryProvider>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('context değerlerini sağlamalıdır', () => {
    let contextValue: any;
    
    const TestComponent = () => {
      contextValue = useDiaryContext();
      return <Text>Test</Text>;
    };

    render(
      <DiaryProvider>
        <TestComponent />
      </DiaryProvider>
    );

    expect(contextValue).toBeTruthy();
    expect(contextValue.state).toBeDefined();
    expect(contextValue.handlers).toBeDefined();
  });

  it('state değerleri doğru olmalıdır', () => {
    let contextValue: any;
    
    const TestComponent = () => {
      contextValue = useDiaryContext();
      return <Text>Test</Text>;
    };

    render(
      <DiaryProvider>
        <TestComponent />
      </DiaryProvider>
    );

    expect(contextValue.state.mode).toBe('list');
    expect(contextValue.state.isLoadingDiaries).toBe(false);
    expect(contextValue.state.userName).toBe('Test User');
    expect(contextValue.state.messages).toEqual([]);
  });

  it('handler fonksiyonlarını sağlamalıdır', () => {
    let contextValue: any;
    
    const TestComponent = () => {
      contextValue = useDiaryContext();
      return <Text>Test</Text>;
    };

    render(
      <DiaryProvider>
        <TestComponent />
      </DiaryProvider>
    );

    expect(typeof contextValue.handlers.startNewDiary).toBe('function');
    expect(typeof contextValue.handlers.viewDiary).toBe('function');
    expect(typeof contextValue.handlers.exitView).toBe('function');
    expect(typeof contextValue.handlers.openModal).toBe('function');
    expect(typeof contextValue.handlers.closeModal).toBe('function');
  });

  it('provider dışında kullanılırsa hata fırlatmalıdır', () => {
    const TestComponent = () => {
      useDiaryContext();
      return <Text>Test</Text>;
    };

    // Console.error'u sustur
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => render(<TestComponent />)).toThrow(
      'useDiaryContext must be used within a DiaryProvider'
    );

    consoleSpy.mockRestore();
  });

  it('useDiary hook\'undan gelen değerleri context\'e aktarmalıdır', () => {
    const mockDiaryLogic = {
      state: {
        mode: 'write' as const,
        isLoadingDiaries: true,
        diaryEvents: [{ id: '1', type: 'diary' }],
        selectedDiary: { id: '1', type: 'diary' },
        userName: 'Custom User',
        messages: [{ text: 'Hello', isUser: true, timestamp: Date.now() }],
        isSubmitting: true,
        currentQuestions: ['Question 1'],
        isModalVisible: true,
        currentInput: 'Test input',
        activeQuestion: 'Question 1',
        isConversationDone: true,
      },
      handlers: {
        startNewDiary: jest.fn(),
        viewDiary: jest.fn(),
        exitView: jest.fn(),
        openModal: jest.fn(),
        closeModal: jest.fn(),
        changeInput: jest.fn(),
        selectQuestion: jest.fn(),
        submitAnswer: jest.fn(),
        saveDiary: jest.fn(),
        deleteDiary: jest.fn(),
      },
    };

    const { useDiary } = require('../../hooks/useDiary');
    useDiary.mockReturnValue(mockDiaryLogic);

    let contextValue: any;
    
    const TestComponent = () => {
      contextValue = useDiaryContext();
      return <Text>Test</Text>;
    };

    render(
      <DiaryProvider>
        <TestComponent />
      </DiaryProvider>
    );

    expect(contextValue.state.mode).toBe('write');
    expect(contextValue.state.isLoadingDiaries).toBe(true);
    expect(contextValue.state.userName).toBe('Custom User');
    expect(contextValue.state.isSubmitting).toBe(true);
  });
});

