// services/api.service.ts
import { getErrorMessage, isAppError } from "../utils/errors";

// Global yüklenme durumu yönetimi için bir callback sistemi (isteğe bağlı)
let globalLoadingSetter: (isLoading: boolean) => void = () => {};
export const setGlobalLoadingIndicator = (setter: (isLoading: boolean) => void) => {
    globalLoadingSetter = setter;
};

// Tüm API çağrılarını saran ana fonksiyon
async function apiCall<T>(promise: Promise<T>): Promise<{ data: T | null; error: string | null }> {
  globalLoadingSetter(true);
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error("⛔️ [API_LAYER_ERROR]", errorMessage, error);
    if (isAppError(error)) {
         return { data: null, error: errorMessage };
    }
    return { data: null, error: "İnternet bağlantınızda bir sorun var gibi görünüyor." };
  } finally {
    globalLoadingSetter(false);
  }
}

// Fonksiyonları buraya taşı. Örnek:
import { logEvent as _logEvent, AppEvent, EventPayload } from './event.service';
export async function logEvent(event: Omit<AppEvent, 'id' | 'user_id' | 'timestamp' | 'created_at'>) {
    return apiCall(_logEvent(event));
}

import { updateUserVault as _updateUserVault, VaultData } from './vault.service';
export async function updateUserVault(vaultData: VaultData) {
    return apiCall(_updateUserVault(vaultData));
}

import { processUserMessage as _processUserMessage } from './orchestration.service';
export async function processUserMessage(userId: string, event: EventPayload) {
    return apiCall(_processUserMessage(userId, event));
}
// ... Diğer asenkron servis fonksiyonları da buraya eklenebilir ... 