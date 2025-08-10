// utils/dev.ts
export function isDev(): boolean {
    const g = globalThis as { __DEV__?: boolean };
    return Boolean(g.__DEV__);
}
