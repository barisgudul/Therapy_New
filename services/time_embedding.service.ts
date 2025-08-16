// services/time_embedding.service.ts
import { AppEvent } from "./event.service";
import { VaultData } from "./vault.service";

// Bu sınıf, bir olayın ZAMANSAL DNA'sını çıkarır.
export class TimeEmbeddingGenerator {
    static generate(event: AppEvent, _vault: VaultData): number[] {
        const time = new Date(event.created_at);

        // Zamanı 5 farklı boyutta analiz ediyoruz.
        const features = [
            time.getHours() / 23, // 0-1 arası: Günün hangi saatinde? (Sabah mı, gece mi?)
            time.getDay() / 6, // 0-1 arası: Haftanın hangi gününde? (Hafta içi mi, sonu mu?)
            this.getNormalizedPositionInCycle(time, 30), // 0-1 arası: Aylık döngünün neresinde?
            this.calculateMoodVelocity(event, _vault), // -1 ile 1 arası: Duygu durumu ne kadar hızlı değişiyor?
            // Daha sonra ekleyeceğimiz özellikler için yer...
            0, // Şimdilik boş.
        ];

        // Bu özelliklerden basit bir vektör oluşturuyoruz.
        // Gerçekte, bu vektörü de bir AI modeline verip 768 boyutlu bir embedding'e çevireceğiz.
        // Ama şimdilik bu basit başlangıç yeterli.
        return this.padVector(features, 768);
    }

    private static getNormalizedPositionInCycle(
        date: Date,
        cycleDays: number,
    ): number {
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const dayOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
        return (dayOfYear % cycleDays) / (cycleDays - 1);
    }

    private static calculateMoodVelocity(
        event: AppEvent,
        _vault: VaultData,
    ): number {
        // Bu fonksiyonu şimdilik basit tutuyoruz.
        // Gelişmiş versiyonu, geçmişteki tüm ruh hallerine bakacak.
        const moodMap: Record<string, number> = {
            "mutlu": 1,
            "neşeli": 0.8,
            "huzurlu": 0.6,
            "nötr": 0,
            "yorgun": -0.4,
            "üzgün": -0.8,
            "kaygılı": -1,
        };
        return moodMap[event.mood || "nötr"] || 0;
    }

    private static padVector(
        features: number[],
        targetLength: number,
    ): number[] {
        const padded = [...features];
        while (padded.length < targetLength) {
            padded.push(0);
        }
        return padded;
    }
}
