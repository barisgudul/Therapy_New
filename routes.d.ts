// routes.d.ts
declare module "expo-router" {
  export type RelativePathString =
    | "/"
    | "/profile"
    | "/avatar"
    | "/achievements"
    | "/ai_summary"
    | "/diary"
    | "/how_it_works"
    | "/daily_write";
}