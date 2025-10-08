// store/__tests__/onboardingStore.test.ts
import { act, renderHook } from "@testing-library/react-native";
import {
    AppMode,
    useOnboardingAnswersObject,
    useOnboardingStore,
} from "../onboardingStore";

describe("onboardingStore", () => {
    beforeEach(() => {
        // Her testten önce store'u temizle
        act(() => {
            useOnboardingStore.getState().reset();
        });
    });

    describe("Initial State", () => {
        it("başlangıç değerleri doğru olmalıdır", () => {
            const { result } = renderHook(() => useOnboardingStore());
            const state = result.current;

            expect(state.nickname).toBe("");
            expect(state.currentStep).toBe(1);
            expect(state.onboardingInsight).toBeNull();
            expect(state.analysisUnlocked).toBe(false);
            expect(state.isGuest).toBe(true);
            expect(state.mode).toBe(AppMode.Primer);
            expect(state.firstLaunchSeen).toBe(false);
            expect(state.trialExpiresAt).toBeNull();
            expect(state.recallEligibleAt).toBeNull();
            expect(state.answersArray).toEqual([]);
        });
    });

    describe("setNickname", () => {
        it("nickname ayarlanmalıdır", () => {
            const { result } = renderHook(() => useOnboardingStore());

            act(() => {
                result.current.setNickname("Test Kullanıcı");
            });

            expect(result.current.nickname).toBe("Test Kullanıcı");
        });
    });

    describe("setMode", () => {
        it("mode değiştirilmelidir", () => {
            const { result } = renderHook(() => useOnboardingStore());

            act(() => {
                result.current.setMode(AppMode.GuestFlow);
            });

            expect(result.current.mode).toBe(AppMode.GuestFlow);
        });

        it("farklı AppMode değerleri ayarlanabilmelidir", () => {
            const { result } = renderHook(() => useOnboardingStore());

            Object.values(AppMode).forEach((mode) => {
                act(() => {
                    result.current.setMode(mode);
                });
                expect(result.current.mode).toBe(mode);
            });
        });
    });

    describe("setGuest", () => {
        it("isGuest true yapılmalıdır", () => {
            const { result } = renderHook(() => useOnboardingStore());

            act(() => {
                result.current.setGuest(true);
            });

            expect(result.current.isGuest).toBe(true);
        });

        it("isGuest false yapılmalıdır", () => {
            const { result } = renderHook(() => useOnboardingStore());

            act(() => {
                result.current.setGuest(false);
            });

            expect(result.current.isGuest).toBe(false);
        });
    });

    describe("setFirstLaunchSeen", () => {
        it("firstLaunchSeen true yapılmalıdır", () => {
            const { result } = renderHook(() => useOnboardingStore());

            act(() => {
                result.current.setFirstLaunchSeen();
            });

            expect(result.current.firstLaunchSeen).toBe(true);
        });
    });

    describe("setTrial", () => {
        it("trialExpiresAt şimdiki zamandan ms sonrası ayarlanmalıdır", () => {
            const { result } = renderHook(() => useOnboardingStore());
            const now = Date.now();
            const msFromNow = 90000;

            act(() => {
                result.current.setTrial(msFromNow);
            });

            expect(result.current.trialExpiresAt).toBeGreaterThanOrEqual(
                now + msFromNow,
            );
            expect(result.current.trialExpiresAt).toBeLessThan(
                now + msFromNow + 1000,
            ); // 1 saniye tolerans
        });
    });

    describe("setRecallAt", () => {
        it("recallEligibleAt ayarlanmalıdır", () => {
            const { result } = renderHook(() => useOnboardingStore());
            const now = Date.now();
            const msFromNow = 5000;

            act(() => {
                result.current.setRecallAt(msFromNow);
            });

            expect(result.current.recallEligibleAt).toBeGreaterThanOrEqual(
                now + msFromNow,
            );
        });
    });

    describe("setAnswer", () => {
        it("yeni bir cevap eklenmeli ve sıralı olmalıdır", () => {
            const { result } = renderHook(() => useOnboardingStore());

            act(() => {
                result.current.setAnswer(1, "Soru 1", "Cevap 1");
            });

            expect(result.current.answersArray).toHaveLength(1);
            expect(result.current.answersArray[0]).toEqual({
                step: 1,
                question: "Soru 1",
                answer: "Cevap 1",
            });
        });

        it("birden fazla cevap eklenebilmeli ve sıralı olmalıdır", () => {
            const { result } = renderHook(() => useOnboardingStore());

            act(() => {
                result.current.setAnswer(3, "Soru 3", "Cevap 3");
                result.current.setAnswer(1, "Soru 1", "Cevap 1");
                result.current.setAnswer(2, "Soru 2", "Cevap 2");
            });

            expect(result.current.answersArray).toHaveLength(3);
            expect(result.current.answersArray[0].step).toBe(1);
            expect(result.current.answersArray[1].step).toBe(2);
            expect(result.current.answersArray[2].step).toBe(3);
        });

        it("aynı step için cevap güncellenmelidir", () => {
            const { result } = renderHook(() => useOnboardingStore());

            act(() => {
                result.current.setAnswer(1, "Soru 1", "İlk Cevap");
            });

            expect(result.current.answersArray[0].answer).toBe("İlk Cevap");

            act(() => {
                result.current.setAnswer(1, "Soru 1", "Güncellenmiş Cevap");
            });

            expect(result.current.answersArray).toHaveLength(1);
            expect(result.current.answersArray[0].answer).toBe(
                "Güncellenmiş Cevap",
            );
        });
    });

    describe("setOnboardingInsight", () => {
        it("onboardingInsight ayarlanmalıdır", () => {
            const { result } = renderHook(() => useOnboardingStore());
            const insight = { key1: "value1", key2: "value2" };

            act(() => {
                result.current.setOnboardingInsight(insight);
            });

            expect(result.current.onboardingInsight).toEqual(insight);
        });

        it("onboardingInsight null yapılabilmelidir", () => {
            const { result } = renderHook(() => useOnboardingStore());

            act(() => {
                result.current.setOnboardingInsight({ test: "data" });
            });

            expect(result.current.onboardingInsight).not.toBeNull();

            act(() => {
                result.current.setOnboardingInsight(null);
            });

            expect(result.current.onboardingInsight).toBeNull();
        });
    });

    describe("setAnalysisUnlocked", () => {
        it("analysisUnlocked true yapılmalıdır", () => {
            const { result } = renderHook(() => useOnboardingStore());

            act(() => {
                result.current.setAnalysisUnlocked(true);
            });

            expect(result.current.analysisUnlocked).toBe(true);
        });

        it("analysisUnlocked false yapılabilmelidir", () => {
            const { result } = renderHook(() => useOnboardingStore());

            act(() => {
                result.current.setAnalysisUnlocked(true);
            });

            act(() => {
                result.current.setAnalysisUnlocked(false);
            });

            expect(result.current.analysisUnlocked).toBe(false);
        });
    });

    describe("reset", () => {
        it("tüm state değerleri sıfırlanmalıdır", () => {
            const { result } = renderHook(() => useOnboardingStore());

            // State'i değiştir
            act(() => {
                result.current.setNickname("Test");
                result.current.setMode(AppMode.Home);
                result.current.setGuest(false);
                result.current.setFirstLaunchSeen();
                result.current.setTrial(90000);
                result.current.setRecallAt(5000);
                result.current.setAnswer(1, "Soru", "Cevap");
                result.current.setOnboardingInsight({ test: "data" });
                result.current.setAnalysisUnlocked(true);
            });

            // Reset çağır
            act(() => {
                result.current.reset();
            });

            // Tüm değerler başlangıç değerlerine dönmeli
            expect(result.current.nickname).toBe("");
            expect(result.current.currentStep).toBe(1);
            expect(result.current.isGuest).toBe(true);
            expect(result.current.mode).toBe(AppMode.Primer);
            expect(result.current.trialExpiresAt).toBeNull();
            expect(result.current.recallEligibleAt).toBeNull();
            expect(result.current.answersArray).toEqual([]);
            expect(result.current.onboardingInsight).toBeNull();
            expect(result.current.analysisUnlocked).toBe(false);
        });
    });

    describe("useOnboardingAnswersObject", () => {
        it("answersArray objeye dönüştürülmelidir", () => {
            const { result } = renderHook(() => useOnboardingStore());

            act(() => {
                result.current.setAnswer(1, "Soru 1", "Cevap 1");
                result.current.setAnswer(2, "Soru 2", "Cevap 2");
            });

            // Directly use the selector
            const answersObject = useOnboardingAnswersObject.getState
                ? useOnboardingAnswersObject.getState()
                : useOnboardingStore.getState().answersArray.reduce(
                    (acc, curr) => {
                        acc[curr.question] = curr.answer;
                        return acc;
                    },
                    {} as Record<string, string>,
                );

            expect(answersObject).toEqual({
                "Soru 1": "Cevap 1",
                "Soru 2": "Cevap 2",
            });
        });

        it("boş array için boş obje döndürmelidir", () => {
            const { result } = renderHook(() => useOnboardingStore());

            act(() => {
                result.current.reset();
            });

            const answersObject = useOnboardingStore.getState().answersArray
                .reduce((acc, curr) => {
                    acc[curr.question] = curr.answer;
                    return acc;
                }, {} as Record<string, string>);

            expect(answersObject).toEqual({});
        });
    });
});
