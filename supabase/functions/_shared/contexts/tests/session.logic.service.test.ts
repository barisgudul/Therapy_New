// supabase/functions/_shared/contexts/__tests__/session.logic.service.test.ts

import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import {
  buildActivityContext,
  extractThemes,
  getTimeAgo,
  norm,
  smartFilterMemories,
} from "../session.logic.service.ts";
import { RecentActivity } from "../session.data.service.ts";

// Test: extractThemes - tema çıkarma fonksiyonu
Deno.test("extractThemes - içerikten doğru temaları çıkarmalı", () => {
  // 1. HAZIRLIK (Arrange)
  const content1 =
    "Bugün işte çok stresli bir gün geçirdim, patronla toplantı yaptık";
  const content2 = "Sevgilimle güzel bir akşam geçirdik, ailemle de görüştük";
  const content3 = "Hastaneye gittim, doktor iyi bir tedavi önerdi";

  // 2. EYLEM (Act)
  const themes1 = extractThemes(content1);
  const themes2 = extractThemes(content2);
  const themes3 = extractThemes(content3);

  // 3. DOĞRULAMA (Assert)
  assertEquals(themes1.includes("iş/kariyer"), true);
  assertEquals(themes1.includes("duygular"), true);
  assertEquals(themes2.includes("ilişkiler"), true);
  assertEquals(themes3.includes("sağlık"), true);
});

// Test: norm - metin normalizasyonu
Deno.test("norm - metni doğru şekilde normalleştirmeli", () => {
  // 1. HAZIRLIK (Arrange)
  const input = "  Bu   bir   test   metni  ";
  const inputWithQuotes = `"Merhaba" 'dünya'`;

  // 2. EYLEM (Act)
  const result1 = norm(input);
  const result2 = norm(inputWithQuotes);

  // 3. DOĞRULAMA (Assert)
  assertEquals(result1, "bu bir test metni");
  assertEquals(result2, "\"merhaba\" 'dünya'");
});

// Test: getTimeAgo - zaman hesaplama
Deno.test("getTimeAgo - doğru zaman dilimini dönmeli", () => {
  // 1. HAZIRLIK (Arrange)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const justNow = new Date(now.getTime() - 5 * 60 * 1000); // 5 dakika önce

  // 2. EYLEM (Act)
  const result1 = getTimeAgo(oneHourAgo);
  const result2 = getTimeAgo(oneDayAgo);
  const result3 = getTimeAgo(justNow);

  // 3. DOĞRULAMA (Assert)
  assertEquals(result1, "1 saat önce");
  assertEquals(result2, "1 gün önce");
  assertEquals(result3, "Az önce");
});

// Test: buildActivityContext - aktivite bağlamı oluşturma
Deno.test("buildActivityContext - boş aktivite listesi için boş string dönmeli", () => {
  // 1. HAZIRLIK (Arrange)
  const activities: RecentActivity[] = [];

  // 2. EYLEM (Act)
  const result = buildActivityContext(activities);

  // 3. DOĞRULAMA (Assert)
  assertEquals(result, "");
});

Deno.test("buildActivityContext - aktivitelerden doğru bağlam oluşturmalı", () => {
  // 1. HAZIRLIK (Arrange)
  const activities: RecentActivity[] = [
    {
      event_type: "diary",
      content: "İş hakkında endişelerim var, patronla konuşmam gerekiyor",
      mood: "endişeli",
      event_time: "2024-01-01T10:00:00Z",
      themes: ["iş/kariyer", "duygular"],
    },
    {
      event_type: "therapy_session",
      content: "Seans çok verimli geçti, kendimi daha iyi hissediyorum",
      mood: "mutlu",
      event_time: "2024-01-02T14:00:00Z",
      themes: ["duygular", "ilişkiler"],
    },
    {
      event_type: "diary",
      content: "Ailemle güzel vakit geçirdim",
      mood: "mutlu",
      event_time: "2024-01-03T16:00:00Z",
      themes: ["ilişkiler"],
    },
  ];

  // 2. EYLEM (Act)
  const result = buildActivityContext(activities);

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.includes("iş/kariyer"), true);
  assertEquals(result.includes("duygular"), true);
  assertEquals(result.includes("ilişkiler"), true);
  assertEquals(result.includes("mutlu"), true);
});

// Test: smartFilterMemories - akıllı filtreleme
Deno.test("smartFilterMemories - yüksek benzerlik her zaman geçmeli", () => {
  // 1. HAZIRLIK (Arrange)
  const memories = [
    { content: "Test memory 1", similarity: 0.9 },
    { content: "Test memory 2", similarity: 0.5 },
    { content: "Test memory 3", similarity: 0.95 },
  ];
  const userMessage = "Test mesajı";
  const recentTopics: string[] = [];

  // 2. EYLEM (Act)
  const result = smartFilterMemories(memories, userMessage, recentTopics);

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.length, 2); // 0.9 ve 0.95 olanlar
  assertEquals(result[0].similarity, 0.9);
  assertEquals(result[1].similarity, 0.95);
});

Deno.test("smartFilterMemories - konu relevansı ile filtreleme", () => {
  // 1. HAZIRLIK (Arrange)
  const memories = [
    { content: "iş hakkında bir anı", similarity: 0.75 },
    { content: "Sağlık hakkında bir anı", similarity: 0.6 },
    { content: "Rastgele bir anı", similarity: 0.5 },
  ];
  const userMessage = "İş hakkında konuşuyorum";
  const recentTopics = ["iş/kariyer"];

  // 2. EYLEM (Act)
  const result = smartFilterMemories(memories, userMessage, recentTopics);

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.length, 1); // Sadece iş hakkındaki anı
  assertEquals(result[0].content, "iş hakkında bir anı");
});

Deno.test("smartFilterMemories - hiçbir şey geçmezse top 2 dönmeli", () => {
  // 1. HAZIRLIK (Arrange)
  const memories = [
    { content: "Test memory 1", similarity: 0.3 },
    { content: "Test memory 2", similarity: 0.4 },
    { content: "Test memory 3", similarity: 0.2 },
  ];
  const userMessage = "Tamamen farklı bir konu";
  const recentTopics: string[] = [];

  // 2. EYLEM (Act)
  const result = smartFilterMemories(memories, userMessage, recentTopics);

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.length, 2); // Top 2
  assertEquals(result[0].content, "Test memory 1");
  assertEquals(result[1].content, "Test memory 2");
});

// Test: smartFilterMemories - lexical overlap kontrolü
Deno.test("smartFilterMemories - lexical overlap ile filtreleme", () => {
  // 1. HAZIRLIK (Arrange)
  const memories = [
    { content: "Bu test mesajı hakkında bir anı", similarity: 0.7 },
    { content: "Tamamen farklı bir içerik", similarity: 0.6 },
  ];
  const userMessage = "Bu test mesajı önemli";
  const recentTopics: string[] = [];

  // 2. EYLEM (Act)
  const result = smartFilterMemories(memories, userMessage, recentTopics);

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.length, 1);
  assertEquals(result[0].content, "Bu test mesajı hakkında bir anı");
});
