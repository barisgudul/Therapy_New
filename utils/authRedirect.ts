// utils/authRedirect.ts
import * as Linking from "expo-linking";
import Constants from "expo-constants";

export function makeRedirectTo(): string {
    const extra = Constants.expoConfig?.extra as
        | { authRedirectPath?: string }
        | undefined;
    const path = extra?.authRedirectPath ?? "auth-callback";
    return Linking.createURL(path);
}
