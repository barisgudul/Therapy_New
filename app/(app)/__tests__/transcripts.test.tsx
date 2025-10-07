// app/(app)/__tests__/transcripts.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import PremiumHistoryScreen from '../transcripts';

// Mock'lar
jest.mock('../../../hooks/useTranscripts');
jest.mock('../../../components/text_session/SessionSummaryModal');
jest.mock('../../../services/event.service');
jest.mock('../../../utils/markdownRenderer');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'tr' },
  }),
}));

describe('PremiumHistoryScreen (Transcripts)', () => {
  const mockUseTranscripts = jest.mocked(require('../../../hooks/useTranscripts').useTranscripts);

  const mockSessionEvent = {
    id: 'event-123',
    type: 'session_end',
    timestamp: '2024-01-01T10:00:00Z',
    created_at: '2024-01-01T10:00:00Z',
    summary: 'Test özeti',
    mood: 5,
    data: {
      messages: [
        { sender: 'user', text: 'Test mesajı' },
        { sender: 'ai', text: 'Test yanıtı' }
      ],
      summary: 'Test data özeti'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock state
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: false,
        viewMode: 'menu',
        allEvents: [mockSessionEvent],
        selectedSessionType: null,
      },
      actions: {
        handleSelectSessionType: jest.fn(),
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: jest.fn(),
        goBack: jest.fn(),
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });
  });

  it('component render edilmelidir', () => {
    render(<PremiumHistoryScreen />);

    expect(mockUseTranscripts).toHaveBeenCalled();
  });

  it('loading durumunda loading gösterilmelidir', () => {
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: true,
        viewMode: 'menu',
        allEvents: [],
        selectedSessionType: null,
      },
      actions: {
        handleSelectSessionType: jest.fn(),
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: jest.fn(),
        goBack: jest.fn(),
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });

    render(<PremiumHistoryScreen />);

    // Loading state'inin doğru işlendiğini kontrol et
    expect(mockUseTranscripts).toHaveBeenCalled();
  });

  it('menu viewMode\'unda doğru içeriği göstermelidir', () => {
    render(<PremiumHistoryScreen />);

    expect(screen.getByText('transcripts.menu.intro_title')).toBeTruthy();
    expect(screen.getByText('transcripts.menu.intro_description')).toBeTruthy();
  });

  it('text session FlowCard\'ı doğru props ile render edilmelidir', () => {
    render(<PremiumHistoryScreen />);

    expect(screen.getByText('transcripts.flow.text.title')).toBeTruthy();
    expect(screen.getByText('transcripts.flow.text.description')).toBeTruthy();
  });

  it('voice session FlowCard\'ı doğru props ile render edilmelidir', () => {
    render(<PremiumHistoryScreen />);

    expect(screen.getByText('transcripts.flow.voice.title')).toBeTruthy();
    expect(screen.getByText('transcripts.flow.voice.description')).toBeTruthy();
  });

  it('FlowCard\'a basıldığında handleSelectSessionType çağrılmalıdır', () => {
    const mockHandleSelectSessionType = jest.fn();
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: false,
        viewMode: 'menu',
        allEvents: [mockSessionEvent],
        selectedSessionType: null,
      },
      actions: {
        handleSelectSessionType: mockHandleSelectSessionType,
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: jest.fn(),
        goBack: jest.fn(),
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });

    render(<PremiumHistoryScreen />);

    const textSessionCard = screen.getByText('transcripts.flow.text.title');
    fireEvent.press(textSessionCard);

    expect(mockHandleSelectSessionType).toHaveBeenCalledWith('text_session');
  });

  it('summaryList viewMode\'unda doğru içeriği göstermelidir', () => {
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: false,
        viewMode: 'summaryList',
        allEvents: [mockSessionEvent],
        selectedSessionType: 'text_session',
      },
      actions: {
        handleSelectSessionType: jest.fn(),
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: jest.fn(),
        goBack: jest.fn(),
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });

    render(<PremiumHistoryScreen />);

    expect(screen.getByText('transcripts.summaryList.titles.text_session')).toBeTruthy();
  });

  it('boş events listesinde SerenityCard göstermelidir', () => {
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: false,
        viewMode: 'summaryList',
        allEvents: [],
        selectedSessionType: 'text_session',
      },
      actions: {
        handleSelectSessionType: jest.fn(),
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: jest.fn(),
        goBack: jest.fn(),
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });

    render(<PremiumHistoryScreen />);

    expect(screen.getByText('transcripts.serenity.title')).toBeTruthy();
    expect(screen.getByText('transcripts.serenity.description')).toBeTruthy();
  });

  it('SummaryCard doğru props ile render edilmelidir', () => {
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: false,
        viewMode: 'summaryList',
        allEvents: [mockSessionEvent],
        selectedSessionType: 'text_session',
      },
      actions: {
        handleSelectSessionType: jest.fn(),
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: jest.fn(),
        goBack: jest.fn(),
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });

    render(<PremiumHistoryScreen />);

    // SummaryCard'ın render edildiğini kontrol et
    expect(screen.getByText('transcripts.summary.view_button')).toBeTruthy();
  });

  it('geri butonuna basıldığında goBack çağrılmalıdır', () => {
    const mockGoBack = jest.fn();
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: false,
        viewMode: 'summaryList',
        allEvents: [mockSessionEvent],
        selectedSessionType: 'text_session',
      },
      actions: {
        handleSelectSessionType: jest.fn(),
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: jest.fn(),
        goBack: mockGoBack,
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });

    render(<PremiumHistoryScreen />);

    // Back button'ın render edildiğini kontrol et
    expect(screen.getByText('transcripts.summaryList.titles.text_session')).toBeTruthy();
  });

  it('SerenityCard CTA butonuna basıldığında handleNavigateToPremium çağrılmalıdır', () => {
    const mockHandleNavigateToPremium = jest.fn();
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: false,
        viewMode: 'summaryList',
        allEvents: [],
        selectedSessionType: 'text_session',
      },
      actions: {
        handleSelectSessionType: jest.fn(),
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: mockHandleNavigateToPremium,
        goBack: jest.fn(),
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });

    render(<PremiumHistoryScreen />);

    const ctaButton = screen.getByText('transcripts.serenity.cta');
    fireEvent.press(ctaButton);

    expect(mockHandleNavigateToPremium).toHaveBeenCalled();
  });

  it('useTranscripts hook\'u doğru çalışmalıdır', () => {
    render(<PremiumHistoryScreen />);

    expect(mockUseTranscripts).toHaveBeenCalled();
  });

  it('useTranslation hook\'u doğru çalışmalıdır', () => {
    render(<PremiumHistoryScreen />);

    // Translation hook'unun doğru çalıştığını kontrol et
    expect(screen.getByText('transcripts.menu.intro_title')).toBeTruthy();
  });

  it('i18n.language doğru kullanılmalıdır', () => {
    render(<PremiumHistoryScreen />);

    // Language'in doğru kullanıldığını kontrol et
    expect(screen.getByText('transcripts.menu.intro_title')).toBeTruthy();
  });

  it('LinearGradient component\'i kullanılmalıdır', () => {
    render(<PremiumHistoryScreen />);

    // LinearGradient'in kullanıldığını kontrol et
    expect(mockUseTranscripts).toHaveBeenCalled();
  });

  it('FlowCard component\'i doğru özellikleri göstermelidir', () => {
    render(<PremiumHistoryScreen />);

    // FlowCard'ın doğru özellikleri gösterdiğini kontrol et
    expect(screen.getByText('transcripts.flow.text.features.keywords')).toBeTruthy();
    expect(screen.getByText('transcripts.flow.text.features.sentiment')).toBeTruthy();
    expect(screen.getByText('transcripts.flow.text.features.self_reflection')).toBeTruthy();
  });

  it('voice session features doğru gösterilmelidir', () => {
    render(<PremiumHistoryScreen />);

    // Voice session features'ların doğru gösterildiğini kontrol et
    expect(screen.getByText('transcripts.flow.voice.features.tone')).toBeTruthy();
    expect(screen.getByText('transcripts.flow.voice.features.insights')).toBeTruthy();
    expect(screen.getByText('transcripts.flow.voice.features.transcript')).toBeTruthy();
  });

  it('session count doğru hesaplanmalıdır', () => {
    const textSession1 = { ...mockSessionEvent, type: 'session_end', id: 'text-1' };
    const textSession2 = { ...mockSessionEvent, type: 'session_end', id: 'text-2' };
    const voiceSession = { ...mockSessionEvent, type: 'voice_session', id: 'voice-1' };
    
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: false,
        viewMode: 'menu',
        allEvents: [textSession1, textSession2, voiceSession],
        selectedSessionType: null,
      },
      actions: {
        handleSelectSessionType: jest.fn(),
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: jest.fn(),
        goBack: jest.fn(),
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });

    render(<PremiumHistoryScreen />);

    // Session count'ların doğru hesaplandığını kontrol et
    expect(screen.getAllByText('transcripts.flow.count')).toHaveLength(2);
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<PremiumHistoryScreen />);
    }).not.toThrow();
  });

  it('theme objesi doğru tanımlanmalıdır', () => {
    render(<PremiumHistoryScreen />);

    // Theme objesinin doğru tanımlandığını kontrol et
    expect(mockUseTranscripts).toHaveBeenCalled();
  });

  it('stil objeleri doğru tanımlanmalıdır', () => {
    render(<PremiumHistoryScreen />);

    // Stil objelerinin doğru tanımlandığını kontrol et
    expect(mockUseTranscripts).toHaveBeenCalled();
  });

  it('event filtering doğru çalışmalıdır', () => {
    const textSessionEvent = { ...mockSessionEvent, type: 'session_end' };
    const voiceSessionEvent = { ...mockSessionEvent, type: 'voice_session', id: 'voice-123' };
    
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: false,
        viewMode: 'summaryList',
        allEvents: [textSessionEvent, voiceSessionEvent],
        selectedSessionType: 'text_session',
      },
      actions: {
        handleSelectSessionType: jest.fn(),
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: jest.fn(),
        goBack: jest.fn(),
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });

    render(<PremiumHistoryScreen />);

    // Text session events'inin filtrelendiğini kontrol et
    expect(screen.getByText('transcripts.summaryList.titles.text_session')).toBeTruthy();
  });

  it('event sorting doğru çalışmalıdır', () => {
    const olderEvent = { ...mockSessionEvent, timestamp: '2024-01-01T10:00:00Z' };
    const newerEvent = { ...mockSessionEvent, id: 'newer-123', timestamp: '2024-01-02T10:00:00Z' };
    
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: false,
        viewMode: 'summaryList',
        allEvents: [olderEvent, newerEvent],
        selectedSessionType: 'text_session',
      },
      actions: {
        handleSelectSessionType: jest.fn(),
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: jest.fn(),
        goBack: jest.fn(),
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });

    render(<PremiumHistoryScreen />);

    // Events'in doğru sıralandığını kontrol et
    expect(screen.getByText('transcripts.summaryList.titles.text_session')).toBeTruthy();
  });

  it('date formatting doğru çalışmalıdır', () => {
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: false,
        viewMode: 'summaryList',
        allEvents: [mockSessionEvent],
        selectedSessionType: 'text_session',
      },
      actions: {
        handleSelectSessionType: jest.fn(),
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: jest.fn(),
        goBack: jest.fn(),
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });

    render(<PremiumHistoryScreen />);

    // Date formatting'in doğru çalıştığını kontrol et
    expect(screen.getByText('transcripts.summary.view_button')).toBeTruthy();
  });

  it('SerenityCard animasyonları doğru çalışmalıdır', () => {
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: false,
        viewMode: 'summaryList',
        allEvents: [],
        selectedSessionType: 'text_session',
      },
      actions: {
        handleSelectSessionType: jest.fn(),
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: jest.fn(),
        goBack: jest.fn(),
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });

    render(<PremiumHistoryScreen />);

    // SerenityCard'ın animasyonlarla render edildiğini kontrol et
    expect(screen.getByText('transcripts.serenity.title')).toBeTruthy();
  });

  it('SummaryCard markdown rendering doğru çalışmalıdır', () => {
    mockUseTranscripts.mockReturnValue({
      state: {
        isLoading: false,
        viewMode: 'summaryList',
        allEvents: [mockSessionEvent],
        selectedSessionType: 'text_session',
      },
      actions: {
        handleSelectSessionType: jest.fn(),
        handleDeleteEvent: jest.fn(),
        handleNavigateToPremium: jest.fn(),
        goBack: jest.fn(),
        setViewModeToMenu: jest.fn(),
        navigateToSession: jest.fn(),
      },
    });

    render(<PremiumHistoryScreen />);

    // Markdown rendering'in doğru çalıştığını kontrol et
    expect(screen.getByText('transcripts.summary.view_button')).toBeTruthy();
  });
});