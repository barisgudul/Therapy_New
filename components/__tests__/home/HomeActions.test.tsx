// components/__tests__/home/HomeActions.test.tsx
/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HomeActions } from '../../home/HomeActions';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn()
  }))
}));

describe('HomeActions', () => {
  const baseProps = {
    onDailyPress: jest.fn(),
    onReportPress: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tüm action butonlarını gösterir', () => {
    render(<HomeActions {...baseProps} />);
    
    expect(screen.getByText('home.actions.daily_mood')).toBeTruthy();
    expect(screen.getByText('home.actions.diary')).toBeTruthy();
    expect(screen.getByText('home.actions.dream_analysis')).toBeTruthy();
    expect(screen.getByText('home.actions.personal_report')).toBeTruthy();
    expect(screen.getByText('home.actions.chat')).toBeTruthy();
    expect(screen.getByText('home.actions.past_chats')).toBeTruthy();
  });

  it('daily butonuna basınca onDailyPress çağrılır', () => {
    render(<HomeActions {...baseProps} />);
    fireEvent.press(screen.getByText('home.actions.daily_mood'));
    expect(baseProps.onDailyPress).toHaveBeenCalled();
  });

  it('rapor varsa özel rapor butonunu gösterir', () => {
    const latestReport = { id: '1', read_at: null } as any;
    render(<HomeActions {...baseProps} latestReport={latestReport} />);
    expect(screen.getByText('home.actions.weekly_insight_ready')).toBeTruthy();
  });

  it('rapor okunmuşsa özel rapor butonunu göstermez', () => {
    const latestReport = { id: '1', read_at: '2024-01-01' } as any;
    render(<HomeActions {...baseProps} latestReport={latestReport} />);
    expect(screen.queryByText('home.actions.weekly_insight_ready')).toBeNull();
  });

  it('onboarding insight butonunu gösterir', () => {
    const onOnboardingInsightPress = jest.fn();
    render(<HomeActions {...baseProps} onOnboardingInsightPress={onOnboardingInsightPress} />);
    expect(screen.getByText('home.actions.first_analysis_ready')).toBeTruthy();
  });

  it('link butonuna basınca how_it_works sayfasına gider', () => {
    const mockPush = jest.fn();
    const { useRouter } = require('expo-router');
    useRouter.mockImplementation(() => ({ push: mockPush }));

    render(<HomeActions {...baseProps} />);
    fireEvent.press(screen.getByText('home.actions.what_is_gisbel'));
    expect(mockPush).toHaveBeenCalledWith('/how_it_works');
  });

  it('diary butonuna basınca diary sayfasına gider', () => {
    const mockPush = jest.fn();
    const { useRouter } = require('expo-router');
    useRouter.mockImplementation(() => ({ push: mockPush }));

    render(<HomeActions {...baseProps} />);
    fireEvent.press(screen.getByText('home.actions.diary'));
    expect(mockPush).toHaveBeenCalledWith('/diary');
  });

  it('dream butonuna basınca dream sayfasına gider', () => {
    const mockPush = jest.fn();
    const { useRouter } = require('expo-router');
    useRouter.mockImplementation(() => ({ push: mockPush }));

    render(<HomeActions {...baseProps} />);
    fireEvent.press(screen.getByText('home.actions.dream_analysis'));
    expect(mockPush).toHaveBeenCalledWith('/dream');
  });

  it('ai_summary butonuna basınca ai_summary sayfasına gider', () => {
    const mockPush = jest.fn();
    const { useRouter } = require('expo-router');
    useRouter.mockImplementation(() => ({ push: mockPush }));

    render(<HomeActions {...baseProps} />);
    fireEvent.press(screen.getByText('home.actions.personal_report'));
    expect(mockPush).toHaveBeenCalledWith('/ai_summary');
  });

  it('therapy butonuna basınca therapy sayfasına gider', () => {
    const mockPush = jest.fn();
    const { useRouter } = require('expo-router');
    useRouter.mockImplementation(() => ({ push: mockPush }));

    render(<HomeActions {...baseProps} />);
    fireEvent.press(screen.getByText('home.actions.chat'));
    expect(mockPush).toHaveBeenCalledWith('/therapy/therapy_options');
  });

  it('transcripts butonuna basınca transcripts sayfasına gider', () => {
    const mockPush = jest.fn();
    const { useRouter } = require('expo-router');
    useRouter.mockImplementation(() => ({ push: mockPush }));

    render(<HomeActions {...baseProps} />);
    fireEvent.press(screen.getByText('home.actions.past_chats'));
    expect(mockPush).toHaveBeenCalledWith('/transcripts');
  });
});
