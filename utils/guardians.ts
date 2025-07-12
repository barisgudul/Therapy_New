// utils/guardians.ts
import { EMERGENCY_RESPONSE_MESSAGE } from './keywords';

export type SafetyLevel = 'safe' | 'sensitive_topic' | 'critical_alert';
export type SafetyClassification = 'level_0_safe' | 'level_1_mild_concern' | 'level_2_moderate_risk' | 'level_3_high_alert';

export interface GuardianV2Result {
  level: SafetyLevel;
  response: string | null;
  isSafeForAI: boolean;
}

export async function assessTextSafety(
  text: string,
  classifier: (text: string) => Promise<SafetyClassification>
): Promise<GuardianV2Result> {
  if (!text || text.trim() === '') {
    return { level: 'safe', response: null, isSafeForAI: true };
  }
  const classification = await classifier(text);
  switch (classification) {
    case 'level_0_safe':
      return { level: 'safe', response: null, isSafeForAI: true };
    case 'level_1_mild_concern':
      console.log("i [GuardianV2] Hassas konu tespit edildi (Seviye 1).");
      return { level: 'sensitive_topic', response: null, isSafeForAI: true };
    case 'level_2_moderate_risk':
    case 'level_3_high_alert':
      console.warn(`🚨 [GuardianV2] KRİTİK UYARI TESPİT EDİLDİ (${classification})! AI döngüsü bypass ediliyor.`);
      return {
        level: 'critical_alert',
        response: EMERGENCY_RESPONSE_MESSAGE,
        isSafeForAI: false,
      };
    default:
      return {
        level: 'critical_alert',
        response: EMERGENCY_RESPONSE_MESSAGE,
        isSafeForAI: false,
      };
  }
}

