// store/__tests__/subscriptionStore.test.ts
import { act, renderHook } from "@testing-library/react-native";
import { useSubscriptionStore } from "../subscriptionStore";

describe("subscriptionStore", () => {
    beforeEach(() => {
        // Her testten önce store'u sıfırla
        const { result } = renderHook(() => useSubscriptionStore());
        act(() => {
            result.current.setPlanName("Free");
        });
    });

    it("başlangıç durumu Free olmalıdır", () => {
        const { result } = renderHook(() => useSubscriptionStore());
        expect(result.current.planName).toBe("Free");
    });

    it("setPlanName ile plan adını değiştirmelidir", () => {
        const { result } = renderHook(() => useSubscriptionStore());

        act(() => {
            result.current.setPlanName("Premium");
        });

        expect(result.current.planName).toBe("Premium");
    });

    it("setPlanName ile +Plus planına geçmelidir", () => {
        const { result } = renderHook(() => useSubscriptionStore());

        act(() => {
            result.current.setPlanName("+Plus");
        });

        expect(result.current.planName).toBe("+Plus");
    });

    it("setPlanName birden fazla kez çağrılabilmelidir", () => {
        const { result } = renderHook(() => useSubscriptionStore());

        act(() => {
            result.current.setPlanName("Premium");
        });
        expect(result.current.planName).toBe("Premium");

        act(() => {
            result.current.setPlanName("Free");
        });
        expect(result.current.planName).toBe("Free");

        act(() => {
            result.current.setPlanName("+Plus");
        });
        expect(result.current.planName).toBe("+Plus");
    });

    it("tüm plan tipleri ile çalışmalıdır", () => {
        const { result } = renderHook(() => useSubscriptionStore());

        const plans: Array<"Free" | "+Plus" | "Premium"> = [
            "Free",
            "+Plus",
            "Premium",
        ];

        plans.forEach((plan) => {
            act(() => {
                result.current.setPlanName(plan);
            });
            expect(result.current.planName).toBe(plan);
        });
    });

    it("state değişikliği console log'lamalıdır", () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation();
        const { result } = renderHook(() => useSubscriptionStore());

        act(() => {
            result.current.setPlanName("Premium");
        });

        expect(consoleSpy).toHaveBeenCalledWith(
            "🧠 [ZUSTAND] Abonelik durumu güncellendi: Premium",
        );

        consoleSpy.mockRestore();
    });

    it("store global olarak paylaşılmalıdır", () => {
        const { result: result1 } = renderHook(() => useSubscriptionStore());
        const { result: result2 } = renderHook(() => useSubscriptionStore());

        act(() => {
            result1.current.setPlanName("Premium");
        });

        expect(result2.current.planName).toBe("Premium");
    });

    it("setPlanName fonksiyonu referansı değişmemelidir", () => {
        const { result, rerender } = renderHook(() => useSubscriptionStore());
        const setPlanName1 = result.current.setPlanName;

        act(() => {
            result.current.setPlanName("Premium");
        });

        rerender(undefined);
        const setPlanName2 = result.current.setPlanName;

        expect(setPlanName1).toBe(setPlanName2);
    });
});
