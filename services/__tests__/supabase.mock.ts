// services/__tests__/supabase.mock.ts

// Jest'in mock fonksiyon tiplerini ve zincirleme yapısını tanımlıyoruz.
type MockReturnThisChain<T> =
    & {
        // T objesindeki her K anahtarı için...
        [K in keyof T]: T[K] extends (...args: infer A) => infer R
            ? jest.Mock<R extends T ? MockReturnThisChain<R> : R, A> // Eğer fonksiyonun dönüş tipi T'nin kendisiyse, zinciri devam ettir.
            : T[K];
    }
    & {
        // Ek olarak, herhangi bir string key için de jest.Mock döndürebilir
        [key: string]: jest.Mock<any, any>;
    };

// Bizim mock'umuzun benzeyeceği arayüz.
// `mockReturnThis` sayesinde select(), eq() gibi fonksiyonlar kendilerini döndürür.
// `single()`, `upsert()` gibi fonksiyonlar ise Promise döndürür.
interface IChainable {
    select: () => IChainable;
    insert: () => IChainable;
    update: () => IChainable;
    upsert: (data: unknown, options?: unknown) => Promise<unknown>;
    delete: () => IChainable;
    eq: (column: string, value: unknown) => IChainable;
    in: (column: string, values: unknown[]) => IChainable;
    gte: (column: string, value: unknown) => IChainable;
    lte: (column: string, value: unknown) => IChainable;
    order: (column: string, options?: unknown) => IChainable;
    limit: (count: number) => IChainable;
    range: (from: number, to: number) => Promise<unknown>;
    single: () => Promise<unknown>;
    maybeSingle: () => Promise<unknown>;
}

// Sonuçta kullanacağımız tip.
export type MockSupabaseQuery = MockReturnThisChain<IChainable>;

/**
 * Bu fonksiyon, jest.fn() ile oluşturulmuş bir Supabase from mock'unu alır
 * ve onu tip güvenli bir objeye dönüştürür.
 */
export const getMockedSupabaseQuery = (
    fromMock: jest.Mock,
): MockSupabaseQuery => {
    // Mock'u çağır ve dönen değeri al
    const mockResult = fromMock("user_vaults");
    return mockResult as MockSupabaseQuery;
};
