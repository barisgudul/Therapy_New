// constants/legal/__tests__/legal.test.ts
import { getContactEmail, getLegalDoc, LEGAL_VERSION } from '../index';

describe('legal content', () => {
  it('has a version string', () => {
    expect(LEGAL_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each(['privacy', 'terms', 'disclaimer'] as const)(
    'returns non-empty %s markdown for each locale',
    (doc) => {
      for (const lang of ['tr', 'en', 'de', 'en-US', 'xx']) {
        const body = getLegalDoc(doc, lang);
        expect(body.length).toBeGreaterThan(200);
        expect(body).toMatch(/^#\s/);
      }
    },
  );

  it('every document makes the not-medical positioning explicit', () => {
    for (const lang of ['tr', 'en', 'de']) {
      const disclaimer = getLegalDoc('disclaimer', lang).toLowerCase();
      expect(disclaimer).toMatch(/not a medical|tıbbi|kein medizinischer/);
    }
  });

  it('falls back to English for unknown languages', () => {
    expect(getLegalDoc('privacy', 'xx')).toBe(getLegalDoc('privacy', 'en'));
    expect(getContactEmail('xx')).toBe(getContactEmail('en'));
  });
});
