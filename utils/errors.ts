// utils/errors.ts

// Hatalarımız için temel bir yapı.
export class AppError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Belirli Hata Türleri
export class ApiError extends AppError {
  constructor(message: string = "Harici servise ulaşılamadı.") {
    super(message, 'API_UNAVAILABLE');
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Gönderilen veri geçersiz.") {
    super(message, 'VALIDATION_ERROR');
  }
}

export class InsufficientDataError extends AppError {
  constructor(message: string = "İşlem için yeterli veri bulunamadı.") {
    super(message, 'INSUFFICIENT_DATA');
  }
}

export class SecurityError extends AppError {
    constructor(message: string = "İçerik güvenlik filtresine takıldı.") {
        super(message, 'SECURITY_VIOLATION');
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = "Kullanıcı kimlik doğrulaması başarısız.") {
        super(message, 'AUTHENTICATION_FAILED');
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = "Bu işlem için yetkiniz bulunmuyor.") {
        super(message, 'AUTHORIZATION_FAILED');
    }
}

export class NetworkError extends AppError {
    constructor(message: string = "Ağ bağlantısı sorunu yaşandı.") {
        super(message, 'NETWORK_ERROR');
    }
}

export class TimeoutError extends AppError {
    constructor(message: string = "İşlem zaman aşımına uğradı.") {
        super(message, 'TIMEOUT_ERROR');
    }
}

export class DatabaseError extends AppError {
    constructor(message: string = "Veritabanı işlemi başarısız.") {
        super(message, 'DATABASE_ERROR');
    }
}

export class ConfigurationError extends AppError {
    constructor(message: string = "Sistem yapılandırması eksik.") {
        super(message, 'CONFIGURATION_ERROR');
    }
}

// Hata yardımcı fonksiyonları
export function isAppError(error: any): error is AppError {
    return error instanceof AppError;
}

export function getErrorCode(error: any): string {
    if (isAppError(error)) {
        return error.code;
    }
    return 'UNKNOWN_ERROR';
}

export function getErrorMessage(error: any): string {
    if (isAppError(error)) {
        return error.message;
    }
    return error?.message || 'Bilinmeyen bir hata oluştu.';
} 