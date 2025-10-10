// app/(app)/__tests__/index.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

import HomeScreen from "../index";

// ============================================
// MOCK'LAR
// ============================================

jest.mock("../../../context/Auth");
jest.mock("../../../hooks/useHomeScreen");
jest.mock("../../../services/report.service");
jest.mock("expo-linear-gradient", () => ({ LinearGradient: "LinearGradient" }));
jest.mock("expo-blur", () => ({ BlurView: "BlurView" }));
jest.mock("expo-router", () => ({
    useRouter: () => ({
        push: jest.fn(),
        back: jest.fn(),
    }),
}));
jest.mock("@tanstack/react-query", () => ({
    ...jest.requireActual("@tanstack/react-query"),
    useQuery: jest.fn(),
}));

// Test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return (
        <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>{children}</SafeAreaProvider>
        </QueryClientProvider>
    );
};

describe("HomeScreen - ANA EKRAN 🏠", () => {
    const mockUseAuth = jest.mocked(require("../../../context/Auth").useAuth);
    const mockUseHomeScreen = jest.mocked(require("../../../hooks/useHomeScreen").useHomeScreen);
    const mockGetLatestUserReport = jest.mocked(require("../../../services/report.service").getLatestUserReport);
    const mockUseQuery = jest.mocked(require("@tanstack/react-query").useQuery);

    let mockHandleModalClose: jest.Mock;
    let mockInvalidateLatestReport: jest.Mock;
    let mockHandleNavigateToTherapy: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockHandleModalClose = jest.fn();
        mockInvalidateLatestReport = jest.fn();
        mockHandleNavigateToTherapy = jest.fn();

        // useQuery mock
        mockUseQuery.mockReturnValue({
            data: null,
            isLoading: false,
            error: null,
        } as any);

        // Varsayılan auth mock
        mockUseAuth.mockReturnValue({
            isPendingDeletion: false,
            isLoading: false,
            user: { id: "user-123", email: "test@example.com" },
            signOut: jest.fn(),
        } as any);

        // Varsayılan homeScreen mock
        mockUseHomeScreen.mockReturnValue({
            activeModal: null,
            scaleAnim: { _value: 1 }, // Basit mock object
            dailyMessage: "Test günlük mesajı",
            isVaultLoading: false,
            handleDailyPress: jest.fn(),
            handleReportPress: jest.fn(),
            handleSettingsPress: jest.fn(),
            handleModalClose: mockHandleModalClose,
            handleNavigateToTherapy: mockHandleNavigateToTherapy,
            invalidateLatestReport: mockInvalidateLatestReport,
        } as any);

        // Varsayılan report mock
        mockGetLatestUserReport.mockResolvedValue(null);
    });

    // ============================================
    // LOADING STATES
    // ============================================
    describe("🔄 Loading States", () => {
        it("isAuthLoading true ise ActivityIndicator göstermeli", () => {
            mockUseAuth.mockReturnValue({
                isPendingDeletion: false,
                isLoading: true, // Loading!
                user: null,
                signOut: jest.fn(),
            } as any);

            const { UNSAFE_root } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            // ActivityIndicator render edilmeli
            const indicators = UNSAFE_root.findAllByType(
                require("react-native").ActivityIndicator
            );
            expect(indicators.length).toBeGreaterThan(0);

            // Ana ekran gösterilmemeli
            expect(screen.queryByTestId("home-screen")).toBeNull();
        });

        it("isVaultLoading true ise ActivityIndicator göstermeli", () => {
            mockUseHomeScreen.mockReturnValue({
                activeModal: null,
                scaleAnim: { _value: 1 },
                dailyMessage: "Test",
                isVaultLoading: true, // Vault loading!
                handleDailyPress: jest.fn(),
                handleReportPress: jest.fn(),
                handleSettingsPress: jest.fn(),
                handleModalClose: mockHandleModalClose,
                handleNavigateToTherapy: mockHandleNavigateToTherapy,
                invalidateLatestReport: mockInvalidateLatestReport,
            } as any);

            const { UNSAFE_root } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            // ActivityIndicator render edilmeli
            const indicators = UNSAFE_root.findAllByType(
                require("react-native").ActivityIndicator
            );
            expect(indicators.length).toBeGreaterThan(0);
        });
    });

    // ============================================
    // PENDING DELETION
    // ============================================
    describe("⏳ Pending Deletion State", () => {
        it("isPendingDeletion true ise PendingDeletionScreen göstermeli", () => {
            mockUseAuth.mockReturnValue({
                isPendingDeletion: true, // Silme bekleniyor!
                isLoading: false,
                user: { id: "user-123", email: "test@example.com" },
                signOut: jest.fn(),
            } as any);

            render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            // Ana ekran gösterilmemeli
            expect(screen.queryByTestId("home-screen")).toBeNull();

            // PendingDeletionScreen mock'landığı için direkt kontrol edemeyiz
            // Ama ana ekran olmadığını doğruladık
        });
    });

    // ============================================
    // MODAL İNTERAKSİYONLARI - KRİTİK!
    // ============================================
    describe("💬 Modal Etkileşimleri", () => {
        it("FeedbackModal onClose çağrıldığında handleModalClose tetiklenmeli", () => {
            mockUseHomeScreen.mockReturnValue({
                activeModal: "dailyMessage",
                scaleAnim: { _value: 1 },
                dailyMessage: "Günlük mesaj",
                isVaultLoading: false,
                handleDailyPress: jest.fn(),
                handleReportPress: jest.fn(),
                handleSettingsPress: jest.fn(),
                handleModalClose: mockHandleModalClose,
                handleNavigateToTherapy: mockHandleNavigateToTherapy,
                invalidateLatestReport: mockInvalidateLatestReport,
            } as any);

            const { UNSAFE_root } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            // FeedbackModal'ı bul
            const FeedbackModal = require("../../../components/daily_reflection/FeedbackModal").default;
            const modalInstances = UNSAFE_root.findAllByType(FeedbackModal);

            expect(modalInstances.length).toBeGreaterThan(0);

            const modal = modalInstances[0];
            expect(modal.props.isVisible).toBe(true);

            // onClose callback'ini çağır
            if (modal.props.onClose) {
                modal.props.onClose();
                expect(mockHandleModalClose).toHaveBeenCalledTimes(1);
            }
        });

        it("FeedbackModal onNavigateToTherapy çağrıldığında handleNavigateToTherapy tetiklenmeli", () => {
            mockUseHomeScreen.mockReturnValue({
                activeModal: "dailyMessage",
                scaleAnim: { _value: 1 },
                dailyMessage: "Terapi önerisi",
                isVaultLoading: false,
                handleDailyPress: jest.fn(),
                handleReportPress: jest.fn(),
                handleSettingsPress: jest.fn(),
                handleModalClose: mockHandleModalClose,
                handleNavigateToTherapy: mockHandleNavigateToTherapy,
                invalidateLatestReport: mockInvalidateLatestReport,
            } as any);

            const { UNSAFE_root } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            const FeedbackModal = require("../../../components/daily_reflection/FeedbackModal").default;
            const modal = UNSAFE_root.findAllByType(FeedbackModal)[0];

            // onNavigateToTherapy callback'ini çağır
            if (modal.props.onNavigateToTherapy) {
                modal.props.onNavigateToTherapy();
                expect(mockHandleNavigateToTherapy).toHaveBeenCalledTimes(1);
            }
        });

        it("ReportModal onClose çağrıldığında handleModalClose VE invalidateLatestReport tetiklenmeli (Satır 106-107)", () => {
            const mockReport = {
                id: "report-123",
                user_id: "user-123",
                report_text: "Test rapor",
                created_at: "2024-01-01",
            };

            // useQuery'den report dönmeli
            mockUseQuery.mockReturnValue({
                data: mockReport,
                isLoading: false,
                error: null,
            } as any);

            mockUseHomeScreen.mockReturnValue({
                activeModal: "report",
                scaleAnim: { _value: 1 },
                dailyMessage: "Test",
                isVaultLoading: false,
                handleDailyPress: jest.fn(),
                handleReportPress: jest.fn(),
                handleSettingsPress: jest.fn(),
                handleModalClose: mockHandleModalClose,
                handleNavigateToTherapy: mockHandleNavigateToTherapy,
                invalidateLatestReport: mockInvalidateLatestReport,
            } as any);

            const { UNSAFE_root } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            // ReportModal'ı bul
            const ReportModal = require("../../../components/ReportModal").default;
            const modalInstances = UNSAFE_root.findAllByType(ReportModal);

            expect(modalInstances.length).toBeGreaterThan(0);

            const modal = modalInstances[0];
            expect(modal.props.isVisible).toBe(true);
            expect(modal.props.report).toEqual(mockReport);

            // onClose callback'ini çağır - BU KRİTİK SATIRLAR 106-107!
            expect(typeof modal.props.onClose).toBe("function");
            
            modal.props.onClose();

            // Her iki fonksiyon da çağrılmalı
            expect(mockHandleModalClose).toHaveBeenCalledTimes(1);
            expect(mockInvalidateLatestReport).toHaveBeenCalledTimes(1);
        });

        it("latestReport null ise ReportModal render edilmemeli (Satır 102)", () => {
            mockGetLatestUserReport.mockResolvedValue(null);

            mockUseHomeScreen.mockReturnValue({
                activeModal: "report",
                scaleAnim: { _value: 1 },
                dailyMessage: "Test",
                isVaultLoading: false,
                handleDailyPress: jest.fn(),
                handleReportPress: jest.fn(),
                handleSettingsPress: jest.fn(),
                handleModalClose: mockHandleModalClose,
                handleNavigateToTherapy: mockHandleNavigateToTherapy,
                invalidateLatestReport: mockInvalidateLatestReport,
            } as any);

            const { UNSAFE_root } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            // ReportModal render edilmemeli (latestReport null)
            const ReportModal = require("../../../components/ReportModal").default;
            const modalInstances = UNSAFE_root.findAllByType(ReportModal);

            expect(modalInstances.length).toBe(0);
        });

        it("activeModal null ise BlurView render edilmemeli (Satır 83)", () => {
            mockUseHomeScreen.mockReturnValue({
                activeModal: null, // Modal yok
                scaleAnim: { _value: 1 },
                dailyMessage: "Test",
                isVaultLoading: false,
                handleDailyPress: jest.fn(),
                handleReportPress: jest.fn(),
                handleSettingsPress: jest.fn(),
                handleModalClose: mockHandleModalClose,
                handleNavigateToTherapy: mockHandleNavigateToTherapy,
                invalidateLatestReport: mockInvalidateLatestReport,
            } as any);

            const { UNSAFE_root } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            // BlurView render edilmemeli
            const BlurView = "BlurView";
            const blurInstances = UNSAFE_root.findAllByType(BlurView);

            expect(blurInstances.length).toBe(0);
        });

        it("activeModal 'dailyMessage' ise BlurView render edilmeli", () => {
            mockUseHomeScreen.mockReturnValue({
                activeModal: "dailyMessage", // Modal aktif
                scaleAnim: { _value: 1 },
                dailyMessage: "Test",
                isVaultLoading: false,
                handleDailyPress: jest.fn(),
                handleReportPress: jest.fn(),
                handleSettingsPress: jest.fn(),
                handleModalClose: mockHandleModalClose,
                handleNavigateToTherapy: mockHandleNavigateToTherapy,
                invalidateLatestReport: mockInvalidateLatestReport,
            } as any);

            const { UNSAFE_root } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            // BlurView render edilmeli
            const BlurView = "BlurView";
            const blurInstances = UNSAFE_root.findAllByType(BlurView);

            expect(blurInstances.length).toBeGreaterThan(0);
        });
    });

    // ============================================
    // COMPONENTaction PROP'LARI TEST
    // ============================================
    describe("🎯 Component Prop'ları ve Callbacks", () => {
        it("HomeHeader onSettingsPress prop'u doğru verilmeli", () => {
            const mockHandleSettingsPress = jest.fn();

            mockUseHomeScreen.mockReturnValue({
                activeModal: null,
                scaleAnim: { _value: 1 },
                dailyMessage: "Test",
                isVaultLoading: false,
                handleDailyPress: jest.fn(),
                handleReportPress: jest.fn(),
                handleSettingsPress: mockHandleSettingsPress,
                handleModalClose: mockHandleModalClose,
                handleNavigateToTherapy: mockHandleNavigateToTherapy,
                invalidateLatestReport: mockInvalidateLatestReport,
            } as any);

            const { UNSAFE_root } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            // HomeHeader'ı bul
            const HomeHeader = require("../../../components/home/HomeHeader").HomeHeader;
            const header = UNSAFE_root.findByType(HomeHeader);

            expect(header.props.onSettingsPress).toBe(mockHandleSettingsPress);
        });

        it("HomeActions onDailyPress prop'u doğru verilmeli", () => {
            const mockHandleDailyPress = jest.fn();

            mockUseHomeScreen.mockReturnValue({
                activeModal: null,
                scaleAnim: { _value: 1 },
                dailyMessage: "Test",
                isVaultLoading: false,
                handleDailyPress: mockHandleDailyPress,
                handleReportPress: jest.fn(),
                handleSettingsPress: jest.fn(),
                handleModalClose: mockHandleModalClose,
                handleNavigateToTherapy: mockHandleNavigateToTherapy,
                invalidateLatestReport: mockInvalidateLatestReport,
            } as any);

            const { UNSAFE_root } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            // HomeActions'ı bul
            const HomeActions = require("../../../components/home/HomeActions").HomeActions;
            const actions = UNSAFE_root.findByType(HomeActions);

            expect(actions.props.onDailyPress).toBe(mockHandleDailyPress);
        });

        it("HomeActions onReportPress prop'u doğru verilmeli", () => {
            const mockHandleReportPress = jest.fn();

            mockUseHomeScreen.mockReturnValue({
                activeModal: null,
                scaleAnim: { _value: 1 },
                dailyMessage: "Test",
                isVaultLoading: false,
                handleDailyPress: jest.fn(),
                handleReportPress: mockHandleReportPress,
                handleSettingsPress: jest.fn(),
                handleModalClose: mockHandleModalClose,
                handleNavigateToTherapy: mockHandleNavigateToTherapy,
                invalidateLatestReport: mockInvalidateLatestReport,
            } as any);

            const { UNSAFE_root } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            const HomeActions = require("../../../components/home/HomeActions").HomeActions;
            const actions = UNSAFE_root.findByType(HomeActions);

            expect(actions.props.onReportPress).toBe(mockHandleReportPress);
        });

        it("HomeActions latestReport prop'u useQuery'den gelmeli", () => {
            const mockReport = {
                id: "report-456",
                user_id: "user-123",
                report_text: "Analiz raporu",
                created_at: "2024-01-01",
            };

            // useQuery mock'unu güncelle
            mockUseQuery.mockReturnValue({
                data: mockReport,
                isLoading: false,
                error: null,
            } as any);

            const { UNSAFE_root } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            const HomeActions = require("../../../components/home/HomeActions").HomeActions;
            const actions = UNSAFE_root.findByType(HomeActions);

            // latestReport prop'u aktarılmalı
            expect(actions.props.latestReport).toEqual(mockReport);
        });
    });

    // ============================================
    // CALLBACK FONKSİYONLARI - SATIR 98, 105-108
    // ============================================
    describe("🎯 Inline Callback Fonksiyonları", () => {
        it("FeedbackModal onSatisfaction boş callback çalışmalı (Satır 98)", () => {
            mockUseHomeScreen.mockReturnValue({
                activeModal: "dailyMessage",
                scaleAnim: { _value: 1 },
                dailyMessage: "Test mesajı",
                isVaultLoading: false,
                handleDailyPress: jest.fn(),
                handleReportPress: jest.fn(),
                handleSettingsPress: jest.fn(),
                handleModalClose: mockHandleModalClose,
                handleNavigateToTherapy: mockHandleNavigateToTherapy,
                invalidateLatestReport: mockInvalidateLatestReport,
            } as any);

            const { UNSAFE_root } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            const FeedbackModal = require("../../../components/daily_reflection/FeedbackModal").default;
            const modal = UNSAFE_root.findByType(FeedbackModal);

            // onSatisfaction callback'ini çağır (satır 98)
            expect(typeof modal.props.onSatisfaction).toBe("function");
            
            // Boş fonksiyon, hata vermemeli
            expect(() => modal.props.onSatisfaction()).not.toThrow();
        });
    });

    // ============================================
    // RENDER TESTLERİ
    // ============================================
    describe("🎨 Temel Render Testleri", () => {
        it("Normal state'te ana ekran render edilmeli", () => {
            render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            expect(screen.getByTestId("home-screen")).toBeTruthy();
        });

        it("Component mount/unmount güvenli olmalı", () => {
            const { unmount } = render(
                <TestWrapper>
                    <HomeScreen />
                </TestWrapper>
            );

            expect(() => unmount()).not.toThrow();
        });
    });
});
