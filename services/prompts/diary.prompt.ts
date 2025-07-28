// services/prompts/diary.prompt.ts
export const getDiaryStartPrompt = (initialEntry: string) => `
Bir kullanıcının günlük başlangıç yazısını analiz et. Görevin:
1. Yazıdaki baskın duyguyu tek kelimeyle belirle (mood).
2. Bu duygu ve metinden yola çıkarak, kullanıcının daha derine inmesini sağlayacak 3 farklı ve açık uçlu soru üret (questions).

METİN: "${initialEntry}"

ÇIKTI (Sadece JSON): { "mood": "belirlediğin_duygu", "questions": ["soru1", "soru2", "soru3"] }`;

export const getDiaryNextQuestionsPrompt = (conversationHistory: string) => `
Bir günlük diyalogu devam ediyor. Kullanıcının son cevabına dayanarak, sohbeti bir adım daha ileri taşıyacak 3 YENİ ve FARKLI soru üret.
KONUŞMA GEÇMİŞİ:
${conversationHistory}

ÇIKTI (Sadece JSON): { "questions": ["yeni_soru1", "yeni_soru2", "yeni_soru3"] }`; 