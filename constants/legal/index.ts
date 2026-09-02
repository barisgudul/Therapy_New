// constants/legal/index.ts
//
// In-app legal documents (Privacy Policy, Terms of Service, Health Disclaimer)
// as Markdown strings, selected by the active UI language.
//
// ⚠️ These are conservative DRAFTS, not legal advice. See the per-language files
// for the "have counsel review before launch" note. The same text must also be
// hosted at a public URL for the App Store / Play Store listings.
import i18n from "../../utils/i18n";
import * as en from "./en";
import * as tr from "./tr";
import * as de from "./de";

/**
 * Bump whenever the substance of any document changes. Users whose stored
 * consent version differs are shown the consent gate again.
 */
export const LEGAL_VERSION = "2026-09-02";

export type LegalDoc = "privacy" | "terms" | "disclaimer";

type LegalBundle = {
  CONTACT_EMAIL: string;
  privacy: string;
  terms: string;
  disclaimer: string;
};

const BUNDLES: Record<string, LegalBundle> = { en, tr, de };

function bundleForLanguage(language: string): LegalBundle {
  const key = language.split("-")[0].toLowerCase();
  return BUNDLES[key] ?? en;
}

/** Markdown body for a document in the current UI language (falls back to English). */
export function getLegalDoc(doc: LegalDoc, language: string = i18n.language): string {
  return bundleForLanguage(language)[doc];
}

export function getContactEmail(language: string = i18n.language): string {
  return bundleForLanguage(language).CONTACT_EMAIL;
}
