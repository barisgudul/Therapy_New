// types/analysis.ts
// AnalysisReport.tsx için
export interface AnalysisReportContent {
    reportSections: {
        mainTitle: string;
        overview: string;
        goldenThread: string;
        blindSpot: string;
    };
    reportAnalogy: {
        title: string;
        text: string;
    };
    derivedData: {
        readMinutes: number;
        headingsCount: number;
    };
}

export interface AnalysisReport {
    id: string;
    created_at: string;
    content: AnalysisReportContent;
    days_analyzed: number;
}
