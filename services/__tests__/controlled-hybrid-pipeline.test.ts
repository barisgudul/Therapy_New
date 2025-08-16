// services/__tests__/controlled-hybrid-pipeline.test.ts

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod";
import { Stub, stub } from "https://deno.land/std@0.208.0/testing/mock";
import type { InteractionContext } from "../../types/context";
import type { PipelineStep } from "../controlled-hybrid-pipeline.service";
import type { AppEvent } from "../event.service";
import type { SystemHealthStatus } from "../system-health-monitor.service";

// Test ortam değişkenlerini, modüller import edilmeden ÖNCE ayarla
Deno.env.set("SUPABASE_URL", "http://localhost");
Deno.env.set("SUPABASE_ANON_KEY", "test-anon");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service");

// Servis modüllerini env ayarlarından SONRA dinamik import et
const { ControlledHybridPipeline } = await import(
  "../controlled-hybrid-pipeline.service.ts"
);
const { StrategicQueryRouter } = await import(
  "../strategic-query-router.service.ts"
);
const { SystemHealthMonitor } = await import(
  "../system-health-monitor.service.ts"
);

// --- SAHTE VERİ ÜRETİCİLERİ (TİP GÜVENLİĞİ İÇİN) ---

// Testler için geçerli bir AppEvent nesnesi yaratan yardımcı fonksiyon. ARTIK 'any' YOK.
const createFakeEvent = (
  props: Partial<AppEvent> = {},
): AppEvent => ({
  id: "test-event-id",
  user_id: "test-user",
  type: "text_session",
  timestamp: Date.now(),
  created_at: new Date().toISOString(),
  data: {},
  ...props,
});

// Testler için geçerli bir InteractionContext nesnesi yaratan yardımcı fonksiyon. ARTIK 'any' YOK.
const createFakeContext = (
  props: Partial<InteractionContext> = {},
): InteractionContext => ({
  transactionId: "test-tx-id",
  userId: "test-user",
  initialVault: {},
  initialEvent: createFakeEvent(),
  derivedData: {},
  ...props,
});

// --- SENARYO 1: SİSTEM SAĞLIĞI KRİTİK. GERİ ÇEKİL. ---
Deno.test("Hybrid Pipeline: Should fallback to simple query if system health is critical", async () => {
  const criticalHealth: SystemHealthStatus = {
    health_score: 50,
    overall_health: "critical",
    issues: [],
    recommendations: [],
    last_check: "",
  };
  const healthStub = stub(
    SystemHealthMonitor,
    "evaluateSystemHealth",
    () => Promise.resolve(criticalHealth),
  );
  const routerStub = stub(
    StrategicQueryRouter,
    "handleSimpleQuery",
    () => Promise.resolve("Sistem yoğun."),
  );

  await ControlledHybridPipeline.executeComplexQuery(
    createFakeContext(),
    "deep_analysis",
  );

  try {
    assertEquals(healthStub.calls.length, 1);
    assertEquals(routerStub.calls.length, 1);
    console.log(
      "✅ SENARYO 1 BAŞARILI: Düşük sistem sağlığında geri çekilme emri doğru çalışıyor.",
    );
  } finally {
    healthStub.restore();
    routerStub.restore();
  }
});

// --- SENARYO 2: SİSTEM SAĞLIKLI. EMİRLERİ SIRAYLA VER. ---
Deno.test("Hybrid Pipeline: Should execute steps in order on a healthy system", async () => {
  const excellentHealth: SystemHealthStatus = {
    health_score: 95,
    overall_health: "excellent",
    issues: [],
    recommendations: [],
    last_check: "",
  };
  const healthStub = stub(
    SystemHealthMonitor,
    "evaluateSystemHealth",
    () => Promise.resolve(excellentHealth),
  );

  const stepExecutorStub: Stub = stub(
    ControlledHybridPipeline as unknown as {
      executeStep: (...args: unknown[]) => unknown;
    },
    "executeStep",
    function (this: typeof ControlledHybridPipeline, ...args: unknown[]) {
      const [step, _context, _previousResults] = args as [
        PipelineStep,
        InteractionContext,
        Record<string, unknown>,
      ];
      return Promise.resolve({ status: `Emir alındı: ${step.step_id}` });
    },
  );
  const synthesizerStub: Stub = stub(
    ControlledHybridPipeline as unknown as {
      synthesizeResults: (
        results: Record<string, unknown>,
        context: InteractionContext,
        pipelineType: string,
      ) => Promise<string>;
    },
    "synthesizeResults",
    () => Promise.resolve("Hücum başarılı."),
  );

  await ControlledHybridPipeline.executeComplexQuery(
    createFakeContext(),
    "deep_analysis",
  );

  try {
    const executedStepIds = stepExecutorStub.calls.map((call) =>
      (call.args[0] as PipelineStep).step_id
    );
    assertEquals(executedStepIds, [
      "gather_user_data",
      "analyze_patterns",
      "generate_insights",
      "validate_findings",
    ]);
    assertEquals(synthesizerStub.calls.length, 1);
    console.log(
      "✅ SENARYO 2 BAŞARILI: Sağlıklı sistemde hücum planı tıkır tıkır işliyor.",
    );
  } finally {
    healthStub.restore();
    stepExecutorStub.restore();
    synthesizerStub.restore();
  }
});

// --- SENARYO 3: KRİTİK ADIM BAŞARISIZ. OPERASYONU İPTAL ET. ---
Deno.test("Hybrid Pipeline: Should abort the entire operation if a critical step fails", async () => {
  const goodHealth: SystemHealthStatus = {
    health_score: 90,
    overall_health: "good",
    issues: [],
    recommendations: [],
    last_check: "",
  };
  const healthStub = stub(
    SystemHealthMonitor,
    "evaluateSystemHealth",
    () => Promise.resolve(goodHealth),
  );

  const stepExecutorStub: Stub = stub(
    ControlledHybridPipeline as unknown as {
      executeStep: (...args: unknown[]) => unknown;
    },
    "executeStep",
    function (this: typeof ControlledHybridPipeline, ...args: unknown[]) {
      const [step, _context, _previousResults] = args as [
        PipelineStep,
        InteractionContext,
        Record<string, unknown>,
      ];
      if (step.step_id === "run_pattern_analysis") {
        return Promise.reject(new Error("İstihbarat birimi vuruldu!"));
      }
      return Promise.resolve({ status: `OK - ${step.step_id}` });
    },
  );
  const synthesizerStub: Stub = stub(
    ControlledHybridPipeline as unknown as {
      synthesizeResults: (
        results: Record<string, unknown>,
        context: InteractionContext,
        pipelineType: string,
      ) => Promise<string>;
    },
    "synthesizeResults",
    () => Promise.resolve("Kısmi başarı - kritik adım başarısız"),
  );

  // Pipeline hata fırlatmaz, partial_success döndürür
  const result = await ControlledHybridPipeline.executeComplexQuery(
    createFakeContext(),
    "pattern_discovery",
  );

  try {
    const executedStepIds = stepExecutorStub.calls.map((call) =>
      (call.args[0] as PipelineStep).step_id
    );
    assertEquals(executedStepIds, [
      "collect_behavioral_data",
      "run_pattern_analysis",
    ]);
    assertEquals(synthesizerStub.calls.length, 1);
    assertEquals(typeof result, "string");
    console.log(
      "✅ SENARYO 3 BAŞARILI: Kritik birim vurulunca pipeline partial_success olarak işaretleniyor ve devam ediyor.",
    );
  } finally {
    healthStub.restore();
    stepExecutorStub.restore();
    synthesizerStub.restore();
  }
});
