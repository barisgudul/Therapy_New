// eslint.config.js - PROD'A HAZIR, TAŞ GİBİ VERSİYON

const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  // Expo'nun temel kurallarını olduğu gibi alıyoruz. Bu bizim tabanımız.
  ...expoConfig,

  // Şimdi kendi özel kurallarımızı ve ayarlarımızı tanımlıyoruz.
  {
    // Bu ayarların tüm dosyalara uygulanacağını belirtiyoruz.
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    
    // Kurallarımızı tanımlıyoruz.
    rules: {
      // no-unused-vars kuralını daha önce yaptığın gibi esnek bırakıyoruz. Aferin.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // 🔥🔥🔥 İŞTE SENİN KATİLİNİ SUSTURAN İKİ KURAL 🔥🔥🔥
      // Bu iki kuralı 'off' yaparak ESLint'in Deno'ya karışmasını engelliyoruz.
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      
      // Test dosyalarında require() import'larını serbest bırak
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  
  // Ignore ayarını da modern formata çeviriyoruz.
  {
    ignores: [
        'dist/*', 
        'node_modules/*', 
        '.expo/*',
        // Gelecekte eklemek istersen diye diğer ignore edilecek yollar...
    ],
  },
]);