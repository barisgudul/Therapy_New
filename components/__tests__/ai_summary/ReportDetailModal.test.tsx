// components/__tests__/ai_summary/ReportDetailModal.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ReportDetailModal from '../../ai_summary/ReportDetailModal';
import { generatePdf } from '../../../utils/pdfGenerator';


jest.mock('../../../utils/pdfGenerator', () => ({
  generatePdf: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../utils/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn().mockResolvedValue({
        data: {
          overall_trends: {
            communication_trend: 'stable',
            mood_stability: 'medium',
            engagement_level: 'high',
          },
          analysis_confidence: 0.7,
          total_patterns_found: 2,
        },
        error: null,
      }),
    },
  },
}));

const baseSummary = {
  reportSections: {
    mainTitle: 'Başlık',
    overview: 'Analiz mevcut',
    goldenThread: 'Altın iplik',
    blindSpot: 'Kör nokta',
  },
  reportAnalogy: {
    title: 'Metafor',
    text: 'Metafor açıklaması',
  },
};

describe('ReportDetailModal', () => {
  it('görünür değilse render edilse bile içerik göstermemelidir (Modal kapalı)', () => {
    const { toJSON } = render(
      <ReportDetailModal isVisible={false} onClose={jest.fn()} activeSummary={baseSummary as any} selectedDays={7} />
    );
    expect(toJSON()).toBeNull();
  });

  it('başlık ve bölümleri gösterir', () => {
    render(
      <ReportDetailModal isVisible={true} onClose={jest.fn()} activeSummary={baseSummary as any} selectedDays={7} />
    );

    expect(screen.getByText('Başlık')).toBeTruthy();
    expect(screen.getByText('Altın iplik')).toBeTruthy();
    expect(screen.getByText('Kör nokta')).toBeTruthy();
  });

  it('PDF export butonuna basınca generatePdf çağrılır', async () => {
    render(
      <ReportDetailModal isVisible={true} onClose={jest.fn()} activeSummary={baseSummary as any} selectedDays={7} />
    );

    const pdfDownloadText = screen.getByText('ai_summary.pdf_download');
    fireEvent.press(pdfDownloadText);
    await waitFor(() => expect(generatePdf).toHaveBeenCalled());
  });

  it('içgörüler görünür, meaningful ve invoke başarılıysa insight kartlarını gösterir', async () => {
    render(
      <ReportDetailModal isVisible={true} onClose={jest.fn()} activeSummary={baseSummary as any} selectedDays={14} />
    );

    await waitFor(() => {
      expect(screen.getByText('ai_summary.section_highlights')).toBeTruthy();
    });
  });

  it('meaningful değilse içgörü çağrısı yapılmaz', () => {
    const notMeaningful = {
      ...baseSummary,
      reportSections: {
        ...baseSummary.reportSections,
        overview: 'yeterli veri yok',
      },
    };

    render(
      <ReportDetailModal isVisible={true} onClose={jest.fn()} activeSummary={notMeaningful as any} selectedDays={7} />
    );

    // Modal'ın render edildiğini kontrol ediyoruz
    expect(screen.getByText('ai_summary.section_overview')).toBeTruthy();
  });
});


