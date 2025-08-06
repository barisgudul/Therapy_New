// eslint.config.js - OLMASI GEREKEN HALİ BU

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  // 1. Expo'nun temel kuralları. Buna dokunmuyoruz.
  expoConfig,

  // 2. Senin ignore ayarın. Bu da kalsın.
  {
    ignores: ['dist/*'],
  },
  
  // 3. İŞTE BİZİM EKLEDİĞİMİZ AYAR OBJESİ. BU, HER ŞEYİ EZER.
  {
    rules: {
      // no-unused-vars kuralına diyoruz ki:
      // "Eğer değişken adı '_' ile başlıyorsa, uyarını kendine sakla."
      '@typescript-eslint/no-unused-vars': [
        'warn', // Hata verme, sadece uyar
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
]);