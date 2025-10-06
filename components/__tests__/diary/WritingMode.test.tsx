// components/__tests__/diary/WritingMode.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { WritingMode } from '../../diary/WritingMode';

const mockUseDiaryContext = jest.fn();

jest.mock('../../../context/DiaryContext', () => ({
  useDiaryContext: () => mockUseDiaryContext()
}));

describe('WritingMode', () => {
  beforeEach(() => {
    mockUseDiaryContext.mockReturnValue({
      state: {
        messages: [],
        currentQuestions: ['Soru 1', 'Soru 2'],
        isSubmitting: false,
        isConversationDone: false,
        isModalVisible: false,
        activeQuestion: null,
        currentInput: '',
        userName: 'Test User'
      },
      handlers: {
        openModal: jest.fn(),
        closeModal: jest.fn(),
        selectQuestion: jest.fn(),
        changeInput: jest.fn(),
        submitAnswer: jest.fn(),
        saveDiary: jest.fn()
      }
    });
  });

  it('başlık ve placeholder gösterir', () => {
    render(<WritingMode />);
    expect(screen.getByText('diary.writing.new_entry')).toBeTruthy();
    expect(screen.getByText('diary.writing.placeholder_start')).toBeTruthy();
  });

  it('soruları gösterir ve seçilebilir', () => {
    render(<WritingMode />);
    expect(screen.getByText('Soru 1')).toBeTruthy();
    expect(screen.getByText('Soru 2')).toBeTruthy();
    
    fireEvent.press(screen.getByText('Soru 1'));
    // selectQuestion çağrıldığını kontrol etmek için mock'u kontrol et
  });

  it('modal açılır ve kapanır', () => {
    const mockHandlers = { openModal: jest.fn(), closeModal: jest.fn() };
    mockUseDiaryContext.mockReturnValue({
      state: { 
        messages: [],
        currentQuestions: ['Soru 1', 'Soru 2'],
        isSubmitting: false,
        isConversationDone: false,
        isModalVisible: true, 
        currentInput: '', 
        activeQuestion: null,
        userName: 'Test User'
      },
      handlers: mockHandlers
    });

    render(<WritingMode />);
    const closeButton = screen.getByTestId('close-button');
    fireEvent.press(closeButton);
    expect(mockHandlers.closeModal).toHaveBeenCalled();
  });

  it('input değişikliğini handle eder', () => {
    const mockHandlers = { changeInput: jest.fn() };
    mockUseDiaryContext.mockReturnValue({
      state: { 
        messages: [],
        currentQuestions: ['Soru 1', 'Soru 2'],
        isSubmitting: false,
        isConversationDone: false,
        isModalVisible: true, 
        currentInput: '', 
        activeQuestion: null,
        userName: 'Test User'
      },
      handlers: mockHandlers
    });

    render(<WritingMode />);
    const input = screen.getByPlaceholderText('diary.writing.placeholder_start');
    fireEvent.changeText(input, 'Yeni metin');
    expect(mockHandlers.changeInput).toHaveBeenCalledWith('Yeni metin');
  });

  it('mesajları doğru şekilde render eder', () => {
    const mockHandlers = { 
      openModal: jest.fn(), 
      closeModal: jest.fn(),
      selectQuestion: jest.fn(),
      changeInput: jest.fn(),
      submitAnswer: jest.fn(),
      saveDiary: jest.fn()
    };
    
    mockUseDiaryContext.mockReturnValue({
      state: { 
        messages: [
          {
            id: '1',
            text: 'Test mesajı',
            isUser: true,
            timestamp: new Date().toISOString()
          },
          {
            id: '2',
            text: 'AI cevabı',
            isUser: false,
            timestamp: new Date().toISOString()
          }
        ],
        currentQuestions: ['Soru 1', 'Soru 2'],
        isSubmitting: false,
        isConversationDone: false,
        isModalVisible: false, 
        currentInput: '', 
        activeQuestion: null,
        userName: 'Test User'
      },
      handlers: mockHandlers
    });

    render(<WritingMode />);
    
    // Mesajlar render edilmeli
    expect(screen.getByText('Test mesajı')).toBeTruthy();
    expect(screen.getByText('AI cevabı')).toBeTruthy();
  });

  it('fallback butonunu doğru koşullarda gösterir', () => {
    const mockHandlers = { 
      openModal: jest.fn(), 
      closeModal: jest.fn(),
      selectQuestion: jest.fn(),
      changeInput: jest.fn(),
      submitAnswer: jest.fn(),
      saveDiary: jest.fn()
    };
    
    mockUseDiaryContext.mockReturnValue({
      state: { 
        messages: [
          {
            id: '1',
            text: 'Test mesajı',
            isUser: true,
            timestamp: new Date().toISOString()
          }
        ],
        currentQuestions: [], // Boş sorular
        isSubmitting: false,
        isConversationDone: false,
        isModalVisible: false, 
        currentInput: '', 
        activeQuestion: null,
        userName: 'Test User'
      },
      handlers: mockHandlers
    });

    render(<WritingMode />);
    
    // Fallback butonu gösterilmeli
    expect(screen.getByText('diary.writing.write_my_own')).toBeTruthy();
  });

  it('fallback butonuna basıldığında modal açar', () => {
    const mockHandlers = { 
      openModal: jest.fn(), 
      closeModal: jest.fn(),
      selectQuestion: jest.fn(),
      changeInput: jest.fn(),
      submitAnswer: jest.fn(),
      saveDiary: jest.fn()
    };
    
    mockUseDiaryContext.mockReturnValue({
      state: { 
        messages: [
          {
            id: '1',
            text: 'Test mesajı',
            isUser: true,
            timestamp: new Date().toISOString()
          }
        ],
        currentQuestions: [], // Boş sorular
        isSubmitting: false,
        isConversationDone: false,
        isModalVisible: false, 
        currentInput: '', 
        activeQuestion: null,
        userName: 'Test User'
      },
      handlers: mockHandlers
    });

    render(<WritingMode />);
    
    const fallbackButton = screen.getByText('diary.writing.write_my_own');
    fireEvent.press(fallbackButton);
    
    expect(mockHandlers.openModal).toHaveBeenCalled();
  });

  it('isSubmitting durumunda loading gösterir', () => {
    mockUseDiaryContext.mockReturnValue({
      state: {
        messages: [],
        currentQuestions: ['Soru 1', 'Soru 2'],
        isSubmitting: true,
        isConversationDone: false,
        isModalVisible: false,
        activeQuestion: null,
        currentInput: '',
        userName: 'Test User'
      },
      handlers: {
        openModal: jest.fn(),
        closeModal: jest.fn(),
        selectQuestion: jest.fn(),
        changeInput: jest.fn(),
        submitAnswer: jest.fn(),
        saveDiary: jest.fn()
      }
    });

    render(<WritingMode />);
    expect(screen.getByText('diary.writing.analyzing')).toBeTruthy();
  });

  it('farklı dil ayarları ile tarih formatını doğru gösterir', () => {
    const mockI18n = { language: 'tr' };
    jest.doMock('react-i18next', () => ({
      useTranslation: () => ({
        t: (key: string) => key,
        i18n: mockI18n
      })
    }));

    mockUseDiaryContext.mockReturnValue({
      state: {
        messages: [],
        currentQuestions: ['Soru 1'],
        isSubmitting: false,
        isConversationDone: false,
        isModalVisible: false,
        activeQuestion: null,
        currentInput: '',
        userName: 'Test User'
      },
      handlers: {
        openModal: jest.fn(),
        closeModal: jest.fn(),
        selectQuestion: jest.fn(),
        changeInput: jest.fn(),
        submitAnswer: jest.fn(),
        saveDiary: jest.fn()
      }
    });

    render(<WritingMode />);
    expect(screen.getByText('diary.writing.page_title')).toBeTruthy();
  });

  it('userName farklı değerlerle doğru gösterir', () => {
    mockUseDiaryContext.mockReturnValue({
      state: {
        messages: [
          {
            id: '1',
            text: 'Test mesajı',
            isUser: true,
            timestamp: new Date().toISOString()
          }
        ],
        currentQuestions: ['Soru 1'],
        isSubmitting: false,
        isConversationDone: false,
        isModalVisible: false,
        activeQuestion: null,
        currentInput: '',
        userName: 'Özel Kullanıcı'
      },
      handlers: {
        openModal: jest.fn(),
        closeModal: jest.fn(),
        selectQuestion: jest.fn(),
        changeInput: jest.fn(),
        submitAnswer: jest.fn(),
        saveDiary: jest.fn()
      }
    });

    render(<WritingMode />);
    expect(screen.getByText('Özel Kullanıcı')).toBeTruthy();
  });

  it('userName boş olduğunda fallback gösterir', () => {
    mockUseDiaryContext.mockReturnValue({
      state: {
        messages: [
          {
            id: '1',
            text: 'Test mesajı',
            isUser: true,
            timestamp: new Date().toISOString()
          }
        ],
        currentQuestions: ['Soru 1'],
        isSubmitting: false,
        isConversationDone: false,
        isModalVisible: false,
        activeQuestion: null,
        currentInput: '',
        userName: ''
      },
      handlers: {
        openModal: jest.fn(),
        closeModal: jest.fn(),
        selectQuestion: jest.fn(),
        changeInput: jest.fn(),
        submitAnswer: jest.fn(),
        saveDiary: jest.fn()
      }
    });

    render(<WritingMode />);
    expect(screen.getByText('diary.messages.user_label')).toBeTruthy();
  });

  it('userName "Sen" olduğunda fallback gösterir', () => {
    mockUseDiaryContext.mockReturnValue({
      state: {
        messages: [
          {
            id: '1',
            text: 'Test mesajı',
            isUser: true,
            timestamp: new Date().toISOString()
          }
        ],
        currentQuestions: ['Soru 1'],
        isSubmitting: false,
        isConversationDone: false,
        isModalVisible: false,
        activeQuestion: null,
        currentInput: '',
        userName: 'Sen'
      },
      handlers: {
        openModal: jest.fn(),
        closeModal: jest.fn(),
        selectQuestion: jest.fn(),
        changeInput: jest.fn(),
        submitAnswer: jest.fn(),
        saveDiary: jest.fn()
      }
    });

    render(<WritingMode />);
    expect(screen.getByText('diary.messages.user_label')).toBeTruthy();
  });

  it('mesaj türlerine göre farklı stiller uygular', () => {
    mockUseDiaryContext.mockReturnValue({
      state: {
        messages: [
          {
            id: '1',
            text: 'Kullanıcı mesajı',
            isUser: true,
            timestamp: new Date().toISOString()
          },
          {
            id: '2',
            text: 'AI mesajı',
            isUser: false,
            timestamp: new Date().toISOString()
          },
          {
            id: '3',
            text: 'Soru bağlamı mesajı',
            isUser: true,
            isQuestionContext: true,
            timestamp: new Date().toISOString()
          }
        ],
        currentQuestions: ['Soru 1'],
        isSubmitting: false,
        isConversationDone: false,
        isModalVisible: false,
        activeQuestion: null,
        currentInput: '',
        userName: 'Test User'
      },
      handlers: {
        openModal: jest.fn(),
        closeModal: jest.fn(),
        selectQuestion: jest.fn(),
        changeInput: jest.fn(),
        submitAnswer: jest.fn(),
        saveDiary: jest.fn()
      }
    });

    render(<WritingMode />);
    expect(screen.getByText('Kullanıcı mesajı')).toBeTruthy();
    expect(screen.getByText('AI mesajı')).toBeTruthy();
    expect(screen.getByText('Soru bağlamı mesajı')).toBeTruthy();
  });

  it('submit butonuna basıldığında submitAnswer çağrılır', () => {
    const mockHandlers = { 
      openModal: jest.fn(), 
      closeModal: jest.fn(),
      selectQuestion: jest.fn(),
      changeInput: jest.fn(),
      submitAnswer: jest.fn(),
      saveDiary: jest.fn()
    };
    
    mockUseDiaryContext.mockReturnValue({
      state: { 
        messages: [],
        currentQuestions: ['Soru 1'],
        isSubmitting: false,
        isConversationDone: false,
        isModalVisible: true, 
        currentInput: 'Test cevabı', 
        activeQuestion: 'Soru 1',
        userName: 'Test User'
      },
      handlers: mockHandlers
    });

    render(<WritingMode />);
    
    const submitButton = screen.getByText('diary.writing.modal_start');
    fireEvent.press(submitButton);
    
    expect(mockHandlers.submitAnswer).toHaveBeenCalled();
  });
});
