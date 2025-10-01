// utils/__tests__/errors.test.ts
// Hata yönetiminin omurgası - Tutarlı hata mesajları için kritik

import {
    ApiError,
    AppError,
    AuthenticationError,
    AuthorizationError,
    ConfigurationError,
    DatabaseError,
    getErrorCode,
    getErrorMessage,
    InsufficientDataError,
    isAppError,
    NetworkError,
    SecurityError,
    TimeoutError,
    ValidationError,
} from "../errors";

describe("errors.ts - Hata Yönetim Sistemi", () => {
    describe("AppError - Temel Hata Sınıfı", () => {
        it("✅ doğru message ve code ile oluşturulmalı", () => {
            const error = new AppError("Test hatası", "TEST_CODE");

            expect(error.message).toBe("Test hatası");
            expect(error.code).toBe("TEST_CODE");
            expect(error.name).toBe("AppError");
        });

        it("✅ varsayılan code kullanmalı", () => {
            const error = new AppError("Test hatası");

            expect(error.code).toBe("UNKNOWN_ERROR");
        });

        it("✅ Error'dan türemeli", () => {
            const error = new AppError("Test");

            expect(error instanceof Error).toBe(true);
            expect(error instanceof AppError).toBe(true);
        });
    });

    describe("Özel Hata Sınıfları", () => {
        it("✅ ApiError doğru varsayılanlarla oluşturulmalı", () => {
            const error = new ApiError();

            expect(error.message).toBe("Harici servise ulaşılamadı.");
            expect(error.code).toBe("API_UNAVAILABLE");
        });

        it("✅ ApiError özel mesajla oluşturulabilmeli", () => {
            const error = new ApiError("API çöktü", "API_CRASH");

            expect(error.message).toBe("API çöktü");
            expect(error.code).toBe("API_CRASH");
        });

        it("✅ ValidationError doğru varsayılanlarla oluşturulmalı", () => {
            const error = new ValidationError();

            expect(error.message).toBe("Gönderilen veri geçersiz.");
            expect(error.code).toBe("VALIDATION_ERROR");
        });

        it("✅ InsufficientDataError doğru varsayılanlarla oluşturulmalı", () => {
            const error = new InsufficientDataError();

            expect(error.message).toBe("İşlem için yeterli veri bulunamadı.");
            expect(error.code).toBe("INSUFFICIENT_DATA");
        });

        it("✅ SecurityError doğru varsayılanlarla oluşturulmalı", () => {
            const error = new SecurityError();

            expect(error.message).toBe("İçerik güvenlik filtresine takıldı.");
            expect(error.code).toBe("SECURITY_VIOLATION");
        });

        it("✅ AuthenticationError doğru varsayılanlarla oluşturulmalı", () => {
            const error = new AuthenticationError();

            expect(error.message).toBe(
                "Kullanıcı kimlik doğrulaması başarısız.",
            );
            expect(error.code).toBe("AUTHENTICATION_FAILED");
        });

        it("✅ AuthorizationError doğru varsayılanlarla oluşturulmalı", () => {
            const error = new AuthorizationError();

            expect(error.message).toBe("Bu işlem için yetkiniz bulunmuyor.");
            expect(error.code).toBe("AUTHORIZATION_FAILED");
        });

        it("✅ DatabaseError doğru varsayılanlarla oluşturulmalı", () => {
            const error = new DatabaseError();

            expect(error.message).toBe("Veritabanı işlemi başarısız oldu.");
            expect(error.code).toBe("DATABASE_ERROR");
        });

        it("✅ NetworkError doğru varsayılanlarla oluşturulmalı", () => {
            const error = new NetworkError();

            expect(error.message).toBe("Ağ bağlantısı sorunu yaşandı.");
            expect(error.code).toBe("NETWORK_ERROR");
        });

        it("✅ TimeoutError doğru varsayılanlarla oluşturulmalı", () => {
            const error = new TimeoutError();

            expect(error.message).toBe("İşlem zaman aşımına uğradı.");
            expect(error.code).toBe("TIMEOUT_ERROR");
        });

        it("✅ ConfigurationError doğru varsayılanlarla oluşturulmalı", () => {
            const error = new ConfigurationError();

            expect(error.message).toBe("Sistem yapılandırması eksik.");
            expect(error.code).toBe("CONFIGURATION_ERROR");
        });
    });

    describe("isAppError - Tip Kontrolü", () => {
        it("✅ AppError için true dönmeli", () => {
            const error = new AppError("Test");

            expect(isAppError(error)).toBe(true);
        });

        it("✅ türetilmiş hatalar için true dönmeli", () => {
            const apiError = new ApiError();
            const validationError = new ValidationError();

            expect(isAppError(apiError)).toBe(true);
            expect(isAppError(validationError)).toBe(true);
        });

        it("❌ standart Error için false dönmeli", () => {
            const error = new Error("Standard error");

            expect(isAppError(error)).toBe(false);
        });

        it("❌ string için false dönmeli", () => {
            expect(isAppError("string error")).toBe(false);
        });

        it("❌ null/undefined için false dönmeli", () => {
            expect(isAppError(null)).toBe(false);
            expect(isAppError(undefined)).toBe(false);
        });

        it("❌ obje için false dönmeli", () => {
            expect(isAppError({ message: "error" })).toBe(false);
        });
    });

    describe("getErrorCode - Kod Çıkarma", () => {
        it("✅ AppError'dan doğru kodu çıkarmalı", () => {
            const error = new AppError("Test", "CUSTOM_CODE");

            expect(getErrorCode(error)).toBe("CUSTOM_CODE");
        });

        it("✅ türetilmiş hatalardan doğru kodu çıkarmalı", () => {
            const apiError = new ApiError();
            const dbError = new DatabaseError();

            expect(getErrorCode(apiError)).toBe("API_UNAVAILABLE");
            expect(getErrorCode(dbError)).toBe("DATABASE_ERROR");
        });

        it("❌ standart Error için UNKNOWN_ERROR dönmeli", () => {
            const error = new Error("Standard");

            expect(getErrorCode(error)).toBe("UNKNOWN_ERROR");
        });

        it("❌ string için UNKNOWN_ERROR dönmeli", () => {
            expect(getErrorCode("error string")).toBe("UNKNOWN_ERROR");
        });

        it("❌ null için UNKNOWN_ERROR dönmeli", () => {
            expect(getErrorCode(null)).toBe("UNKNOWN_ERROR");
        });
    });

    describe("getErrorMessage - Mesaj Çıkarma", () => {
        it("✅ AppError'dan doğru mesajı çıkarmalı", () => {
            const error = new AppError("Özel mesaj", "CODE");

            expect(getErrorMessage(error)).toBe("Özel mesaj");
        });

        it("✅ türetilmiş hatalardan doğru mesajı çıkarmalı", () => {
            const apiError = new ApiError();

            expect(getErrorMessage(apiError)).toBe(
                "Harici servise ulaşılamadı.",
            );
        });

        it("✅ standart Error'dan mesajı çıkarmalı", () => {
            const error = new Error("Standard error message");

            expect(getErrorMessage(error)).toBe("Standard error message");
        });

        it("✅ message property'si olan objeden mesajı çıkarmalı", () => {
            const errorObj = { message: "Obje hatası" };

            expect(getErrorMessage(errorObj)).toBe("Obje hatası");
        });

        it("❌ string için varsayılan mesaj dönmeli", () => {
            expect(getErrorMessage("string error")).toBe(
                "Bilinmeyen bir hata oluştu.",
            );
        });

        it("❌ number için varsayılan mesaj dönmeli", () => {
            expect(getErrorMessage(404)).toBe("Bilinmeyen bir hata oluştu.");
        });

        it("❌ null için varsayılan mesaj dönmeli", () => {
            expect(getErrorMessage(null)).toBe("Bilinmeyen bir hata oluştu.");
        });

        it("❌ undefined için varsayılan mesaj dönmeli", () => {
            expect(getErrorMessage(undefined)).toBe(
                "Bilinmeyen bir hata oluştu.",
            );
        });

        it("✅ message property'si olmayan obje için varsayılan mesaj dönmeli", () => {
            const errorObj = { code: "ERROR" };

            expect(getErrorMessage(errorObj)).toBe(
                "Bilinmeyen bir hata oluştu.",
            );
        });
    });

    describe("Hata Zincirleme", () => {
        it("✅ iç içe hatalar doğru çalışmalı", () => {
            const innerError = new ValidationError("İç hata");
            const outerError = new ApiError("Dış hata");

            expect(isAppError(innerError)).toBe(true);
            expect(isAppError(outerError)).toBe(true);
            expect(getErrorCode(innerError)).toBe("VALIDATION_ERROR");
            expect(getErrorCode(outerError)).toBe("API_UNAVAILABLE");
        });
    });
});
