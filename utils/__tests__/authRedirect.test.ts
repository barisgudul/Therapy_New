// utils/__tests__/authRedirect.test.ts
import { makeRedirectTo } from "../authRedirect";
import * as Linking from "expo-linking";
import Constants from "expo-constants";

jest.mock("expo-linking", () => ({
    createURL: jest.fn((path: string) => `myapp://${path}`),
}));

jest.mock("expo-constants", () => ({
    __esModule: true,
    default: {
        expoConfig: {
            extra: {
                authRedirectPath: undefined,
            },
        },
    },
}));

describe("authRedirect", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("default auth-callback path'i kullanmalıdır", () => {
        const result = makeRedirectTo();

        expect(Linking.createURL).toHaveBeenCalledWith("auth-callback");
        expect(result).toBe("myapp://auth-callback");
    });

    it("expoConfig.extra.authRedirectPath varsa onu kullanmalıdır", () => {
        const mockConstants = Constants as any;
        mockConstants.expoConfig = {
            extra: {
                authRedirectPath: "custom-auth-path",
            },
        };

        const result = makeRedirectTo();

        expect(Linking.createURL).toHaveBeenCalledWith("custom-auth-path");
        expect(result).toBe("myapp://custom-auth-path");
    });

    it("expoConfig undefined ise default path kullanmalıdır", () => {
        const mockConstants = Constants as any;
        mockConstants.expoConfig = undefined;

        const result = makeRedirectTo();

        expect(Linking.createURL).toHaveBeenCalledWith("auth-callback");
        expect(result).toBe("myapp://auth-callback");
    });

    it("expoConfig.extra undefined ise default path kullanmalıdır", () => {
        const mockConstants = Constants as any;
        mockConstants.expoConfig = { extra: undefined };

        const result = makeRedirectTo();

        expect(Linking.createURL).toHaveBeenCalledWith("auth-callback");
        expect(result).toBe("myapp://auth-callback");
    });

    it("expoConfig.extra.authRedirectPath boş string ise o string kullanılmalıdır", () => {
        const mockConstants = Constants as any;
        mockConstants.expoConfig = {
            extra: {
                authRedirectPath: "",
            },
        };

        const result = makeRedirectTo();

        // Boş string ?? operatörü tarafından default'a dönmez (falsy ama nullish değil)
        expect(Linking.createURL).toHaveBeenCalledWith("");
        expect(result).toBe("myapp://");
    });

    it("Linking.createURL çağrısının return değerini döndürmelidir", () => {
        (Linking.createURL as jest.Mock).mockReturnValueOnce(
            "custom://different-url",
        );

        const result = makeRedirectTo();

        expect(result).toBe("custom://different-url");
    });

    it("birden fazla kez çağrılabilmelidir", () => {
        const result1 = makeRedirectTo();
        const result2 = makeRedirectTo();

        expect(Linking.createURL).toHaveBeenCalledTimes(2);
        expect(result1).toBe(result2);
    });

    it("özel karakterler içeren path ile çalışmalıdır", () => {
        const mockConstants = Constants as any;
        mockConstants.expoConfig = {
            extra: {
                authRedirectPath: "auth/callback-123",
            },
        };

        const result = makeRedirectTo();

        expect(Linking.createURL).toHaveBeenCalledWith("auth/callback-123");
    });
});
