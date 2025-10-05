// components/__tests__/ReportModal.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ReportModal from '../ReportModal';
import { UserReport } from '../../services/report.service';
import * as ReportService from '../../services/report.service'; // Servisi import et

// Servis modülünü mock'luyoruz
jest.mock('../../services/report.service');

const mockReport: UserReport = {
  id: '123',
  user_id: 'user-123',
  report_title: 'Test Rapor Başlığı',
  report_content_markdown: '## Alt Başlık\n\nBu bir test içeriğidir.',
  generated_at: '2024-01-01T00:00:00Z',
  read_at: null,
  feedback: null,
};

describe('ReportModal', () => {
  // Her testten önce mock'ları temizle
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('isVisible false olduğunda render edilmemelidir', () => {
    render(
      <ReportModal isVisible={false} onClose={() => {}} report={mockReport} />
    );
    // Modal kapalıyken başlığın ekranda olmamasını bekleriz
    expect(screen.queryByText(mockReport.report_title)).toBeNull();
  });

  it('isVisible true olduğunda rapor başlığını ve içeriğini göstermelidir', () => {
    render(
      <ReportModal isVisible={true} onClose={() => {}} report={mockReport} />
    );

    expect(screen.getByText(mockReport.report_title)).toBeTruthy();
    // DÜZELTME: Metni regex ile ara
    expect(screen.getByText(/Bu bir test içeriğidir./)).toBeTruthy();
  });

  it('kapatma butonuna basıldığında onClose fonksiyonunu çağırmalıdır', () => {
    const onCloseMock = jest.fn();
    render(
      <ReportModal isVisible={true} onClose={onCloseMock} report={mockReport} />
    );

    const closeButton = screen.getByText('home.report_modal.close_button');
    fireEvent.press(closeButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('görünür olduğunda markReportAsRead servisini çağırmalıdır', () => {
    const markReportAsReadMock = jest.spyOn(ReportService, 'markReportAsRead');
    
    render(
      <ReportModal isVisible={true} onClose={() => {}} report={mockReport} />
    );

    // useEffect'in tetiklenmesiyle servisin doğru ID ile çağrıldığını kontrol et
    expect(markReportAsReadMock).toHaveBeenCalledWith(mockReport.id);
    expect(markReportAsReadMock).toHaveBeenCalledTimes(1);
  });

  it('isVisible false olduğunda markReportAsRead servisini ÇAĞIRMAMALIDIR', () => {
     const markReportAsReadMock = jest.spyOn(ReportService, 'markReportAsRead');

     render(
       <ReportModal isVisible={false} onClose={() => {}} report={mockReport} />
     );
 
     expect(markReportAsReadMock).not.toHaveBeenCalled();
  });

  it('rapor başlığı yoksa varsayılan başlığı göstermelidir', () => {
    const reportWithoutTitle = {
      ...mockReport,
      report_title: '',
    };

    render(
      <ReportModal isVisible={true} onClose={() => {}} report={reportWithoutTitle} />
    );

    expect(screen.getByText('home.report_modal.default_title')).toBeTruthy();
  });

  it('farklı markdown içerikleriyle çalışmalıdır', () => {
    const reportWithComplexMarkdown = {
      ...mockReport,
      report_content_markdown: '# Başlık\n\n**Kalın metin** ve *italik metin*.\n\n- Liste öğesi 1\n- Liste öğesi 2',
    };

    render(
      <ReportModal isVisible={true} onClose={() => {}} report={reportWithComplexMarkdown} />
    );

    // DÜZELTME: Metni regex ile ara
    expect(screen.getByText(/Kalın metin/)).toBeTruthy();
    expect(screen.getByText(/Liste öğesi 2/)).toBeTruthy();
  });

  it('rapor ID\'si yoksa markReportAsRead çağrılmamalıdır', () => {
    const reportWithoutId = {
      ...mockReport,
      id: '',
    };
    const markReportAsReadMock = jest.spyOn(ReportService, 'markReportAsRead');

    render(
      <ReportModal isVisible={true} onClose={() => {}} report={reportWithoutId} />
    );

    expect(markReportAsReadMock).not.toHaveBeenCalled();
  });

  it('modal görünürlüğü değiştiğinde useEffect tetiklenmelidir', () => {
    const markReportAsReadMock = jest.spyOn(ReportService, 'markReportAsRead');
    const { rerender } = render(
      <ReportModal isVisible={false} onClose={() => {}} report={mockReport} />
    );

    // Başlangıçta çağrılmamalı
    expect(markReportAsReadMock).not.toHaveBeenCalled();

    // Modal'ı görünür yap
    rerender(
      <ReportModal isVisible={true} onClose={() => {}} report={mockReport} />
    );

    // Şimdi çağrılmalı
    expect(markReportAsReadMock).toHaveBeenCalledWith(mockReport.id);
  });
});
