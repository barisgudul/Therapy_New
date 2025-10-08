// utils/__tests__/dialog.test.ts
import * as RN from "react-native";
import { showDeleteConfirmation, showErrorDialog } from "../dialog";

// Mock Alert at the module level
jest.spyOn(RN.Alert, "alert");

describe("dialog utils", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("showDeleteConfirmation", () => {
        it("Alert.alert çağrılmalıdır", () => {
            const mockOnConfirm = jest.fn();

            showDeleteConfirmation(mockOnConfirm);

            expect(RN.Alert.alert).toHaveBeenCalled();
            expect(RN.Alert.alert).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.any(Array),
            );
        });

        it("doğru başlık ile çağrılmalıdır", () => {
            const mockOnConfirm = jest.fn();

            showDeleteConfirmation(mockOnConfirm);

            const call = (RN.Alert.alert as jest.Mock).mock.calls[0];
            expect(call[0]).toBe("Seansı Kalıcı Olarak Sil");
        });

        it("doğru mesaj ile çağrılmalıdır", () => {
            const mockOnConfirm = jest.fn();

            showDeleteConfirmation(mockOnConfirm);

            const call = (RN.Alert.alert as jest.Mock).mock.calls[0];
            expect(call[1]).toContain("kalıcı olarak silinecektir");
        });

        it("iki buton içermelidir", () => {
            const mockOnConfirm = jest.fn();

            showDeleteConfirmation(mockOnConfirm);

            const call = (RN.Alert.alert as jest.Mock).mock.calls[0];
            const buttons = call[2];
            expect(buttons).toHaveLength(2);
        });
    });

    describe("showErrorDialog", () => {
        it("Alert.alert çağrılmalıdır", () => {
            showErrorDialog();

            expect(RN.Alert.alert).toHaveBeenCalled();
        });

        it("varsayılan mesaj ile çağrılmalıdır", () => {
            showErrorDialog();

            const call = (RN.Alert.alert as jest.Mock).mock.calls[0];
            expect(call[0]).toBe("Hata");
            expect(call[1]).toContain("internet bağlantınızı kontrol");
        });

        it("özel mesaj ile çağrılabilmelidir", () => {
            const customMessage = "Özel hata mesajı";

            showErrorDialog(customMessage);

            const call = (RN.Alert.alert as jest.Mock).mock.calls[0];
            expect(call[1]).toBe(customMessage);
        });

        it("birden fazla kez çağrılabilmelidir", () => {
            showErrorDialog("İlk hata");
            showErrorDialog("İkinci hata");

            expect(RN.Alert.alert).toHaveBeenCalledTimes(2);
        });
    });
});
