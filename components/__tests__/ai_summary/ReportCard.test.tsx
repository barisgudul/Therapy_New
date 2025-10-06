// components/__tests__/ai_summary/ReportCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ReportCard from '../../ai_summary/ReportCard';

describe('ReportCard', () => {
  const baseItem = {
    id: 'r1',
    created_at: '2024-05-10T12:00:00Z',
    days_analyzed: 7,
    content: {
      reportSections: {
        mainTitle: 'Özet Başlığı',
        overview: 'Kısa bir genel bakış',
      },
      reportAnalogy: {
        title: 'Metafor',
        text: 'Metaforik açıklama',
      },
    },
  } as const;

  it('başlığı, tarih ve gün bilgisini gösterir', () => {
    render(
      <ReportCard
        item={baseItem as any}
        onPress={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('Özet Başlığı')).toBeTruthy();
    expect(screen.getByText(/ai_summary.card_subtitle/)).toBeTruthy();
  });

  it('onPress tetiklenir', () => {
    const onPress = jest.fn();
    render(
      <ReportCard item={baseItem as any} onPress={onPress} onDelete={jest.fn()} />
    );
    fireEvent.press(screen.getByText('Özet Başlığı'));
    expect(onPress).toHaveBeenCalled();
  });

  it('onDelete tetiklenir', () => {
    const onDelete = jest.fn();
    render(
      <ReportCard item={baseItem as any} onPress={jest.fn()} onDelete={onDelete} />
    );
    const deleteIconButton = screen.getByTestId('delete-button') || screen.getByText('🗑️');
    fireEvent.press(deleteIconButton);
    expect(onDelete).toHaveBeenCalled();
  });

  it('overview yoksa fallback metni gösterir', () => {
    const itemNoOverview = {
      ...baseItem,
      content: {
        ...baseItem.content,
        reportAnalogy: { ...baseItem.content.reportAnalogy, text: '' },
        reportSections: { ...baseItem.content.reportSections, overview: '' },
      },
    };
    render(
      <ReportCard item={itemNoOverview as any} onPress={jest.fn()} onDelete={jest.fn()} />
    );
    expect(screen.getByText('ai_summary.no_overview')).toBeTruthy();
  });
});


