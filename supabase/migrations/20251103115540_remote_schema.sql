CREATE OR REPLACE FUNCTION public.get_iso_week_start(ts timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT date_trunc('week', ts)::date;
$function$;

create extension if not exists "vector" with schema "extensions";


create schema if not exists "private";


create extension if not exists "pg_net" with schema "public" version '0.14.0';

create table "public"."ai_decision_log" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "decision_context" text not null,
    "decision_made" text not null,
    "reasoning" text,
    "execution_result" jsonb,
    "user_satisfaction_score" integer,
    "confidence_level" numeric(3,2),
    "alternative_decisions" jsonb default '[]'::jsonb,
    "decision_speed_ms" integer,
    "decision_category" text not null,
    "complexity_level" text,
    "created_at" timestamp with time zone default now(),
    "reviewed_at" timestamp with time zone
);


alter table "public"."ai_decision_log" enable row level security;

create table "public"."ai_interactions" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "transaction_id" text,
    "user_id" uuid,
    "model" text not null,
    "prompt" text not null,
    "response" text not null,
    "is_valid_json" boolean,
    "duration_ms" integer
);


alter table "public"."ai_interactions" enable row level security;

create table "public"."ai_logs" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "transaction_id" text,
    "user_id" uuid,
    "intent" text,
    "rag_query" text,
    "rag_results" jsonb,
    "final_prompt" text,
    "final_response" text,
    "execution_time_ms" integer,
    "error_message" text,
    "success" boolean default true
);


alter table "public"."ai_logs" enable row level security;

create table "public"."ai_simulations" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "prediction_id" uuid,
    "simulation_type" text not null,
    "setup_prompt" text not null,
    "result_json" jsonb not null,
    "generated_at" timestamp with time zone not null default now(),
    "duration_ms" integer
);


alter table "public"."ai_simulations" enable row level security;

create table "public"."analysis_reports" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "content" jsonb not null,
    "days_analyzed" smallint not null
);


alter table "public"."analysis_reports" enable row level security;

create table "public"."app_logs" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "transaction_id" text,
    "user_id" uuid,
    "log_level" text not null,
    "source_function" text not null,
    "message" text,
    "metadata" jsonb,
    "is_error" boolean generated always as ((log_level = 'ERROR'::text)) stored
);


alter table "public"."app_logs" enable row level security;

create table "public"."background_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "intent" text not null,
    "payload" jsonb,
    "status" text not null default 'pending'::text,
    "attempts" integer not null default 0,
    "last_error" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."cognitive_memories" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "content" text not null,
    "event_time" timestamp with time zone not null,
    "sentiment_data" jsonb,
    "stylometry_data" jsonb,
    "content_embedding" extensions.vector(768),
    "sentiment_embedding" extensions.vector(768),
    "stylometry_embedding" extensions.vector(768),
    "created_at" timestamp with time zone default now(),
    "source_event_id" uuid,
    "transaction_id" text,
    "mood" text,
    "event_type" text
);


alter table "public"."cognitive_memories" enable row level security;

create table "public"."events" (
    "created_at" timestamp with time zone not null default now(),
    "user_id" uuid not null,
    "type" text not null,
    "mood" text,
    "data" jsonb,
    "id" uuid not null default gen_random_uuid(),
    "timestamp" timestamp with time zone not null default now(),
    "transaction_id" text
);


alter table "public"."events" enable row level security;

create table "public"."feature_usage_counters" (
    "user_id" uuid not null,
    "feature" text not null,
    "period" text not null,
    "period_key" text not null,
    "used_count" integer not null default 0,
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."feature_usage_counters" enable row level security;

create table "public"."journey_logs" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "user_id" uuid not null,
    "log_text" text
);


alter table "public"."journey_logs" enable row level security;

create table "public"."payment_history" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "subscription_id" uuid,
    "amount" numeric(10,2) not null,
    "currency" character varying(3) default 'TRY'::character varying,
    "payment_method" character varying(50),
    "payment_reference" character varying(255),
    "status" character varying(20) default 'pending'::character varying,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."payment_history" enable row level security;

create table "public"."pending_text_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "context_data" jsonb not null,
    "created_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone default (now() + '00:15:00'::interval),
    "used_at" timestamp with time zone
);


alter table "public"."pending_text_sessions" enable row level security;

create table "public"."plan_feature_limits" (
    "plan_id" uuid not null,
    "feature" text not null,
    "period" text not null,
    "limit_count" integer not null
);


alter table "public"."plan_feature_limits" enable row level security;

create table "public"."predicted_outcomes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "prediction_type" text not null,
    "title" text not null,
    "description" text not null,
    "probability_score" numeric(3,2) not null,
    "time_horizon_hours" integer not null,
    "suggested_action" text,
    "trigger_reason" text not null default 'manual'::text,
    "user_feedback" integer,
    "generated_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone not null
);


alter table "public"."predicted_outcomes" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "nickname" text,
    "onboarding_insight" jsonb,
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
);


alter table "public"."profiles" enable row level security;

create table "public"."prompt_versions" (
    "id" bigint generated always as identity not null,
    "prompt_id" bigint not null,
    "version" integer not null,
    "content" text not null,
    "metadata" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."prompt_versions" enable row level security;

create table "public"."prompts" (
    "id" bigint generated always as identity not null,
    "name" text not null,
    "active_version" integer not null default 1,
    "created_at" timestamp with time zone default now()
);


alter table "public"."prompts" enable row level security;

create table "public"."rag_invocation_logs" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "transaction_id" text,
    "user_id" uuid,
    "source_function" text not null,
    "search_query" text not null,
    "retrieved_memories" jsonb,
    "retrieved_count" integer
);


alter table "public"."rag_invocation_logs" enable row level security;

create table "public"."simulations" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "setup_prompt" text not null,
    "trigger_prediction_id" uuid,
    "simulation_log" jsonb not null default '[]'::jsonb,
    "outcome_summary" text,
    "user_dna_snapshot" jsonb not null,
    "simulation_type" text not null default 'scenario_walkthrough'::text,
    "duration_minutes" integer,
    "confidence_score" numeric(3,2),
    "user_feedback" integer,
    "feedback_text" text,
    "created_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone
);


alter table "public"."simulations" enable row level security;

create table "public"."subscription_plans" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "price_usd" numeric(10,2) not null default 0,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."subscription_plans" enable row level security;

create table "public"."system_logs" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "transaction_id" text,
    "user_id" uuid,
    "function_name" text not null,
    "log_level" text not null,
    "message" text,
    "payload" jsonb
);


alter table "public"."system_logs" enable row level security;

create table "public"."system_performance_metrics" (
    "id" uuid not null default gen_random_uuid(),
    "metric_name" text not null,
    "metric_value" numeric(10,4) not null,
    "metric_unit" text,
    "measurement_context" jsonb,
    "time_window_hours" integer default 24,
    "previous_value" numeric(10,4),
    "trend_direction" text,
    "measured_at" timestamp with time zone default now()
);


alter table "public"."system_performance_metrics" enable row level security;

create table "public"."user_reports" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "report_title" text,
    "report_content_markdown" text not null,
    "generated_at" timestamp with time zone default now(),
    "report_period_start" timestamp with time zone not null,
    "report_period_end" timestamp with time zone not null,
    "read_at" timestamp with time zone,
    "feedback" smallint
);


alter table "public"."user_reports" enable row level security;

create table "public"."user_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "plan_id" uuid not null,
    "is_active" boolean not null default true,
    "started_at" timestamp with time zone not null default now(),
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."user_subscriptions" enable row level security;

create table "public"."user_traits" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "confidence" numeric(3,2) default 0.5,
    "anxiety_level" numeric(3,2) default 0.5,
    "motivation" numeric(3,2) default 0.5,
    "openness" numeric(3,2) default 0.5,
    "neuroticism" numeric(3,2) default 0.5,
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_traits" enable row level security;

create table "public"."user_vaults" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "user_id" uuid not null,
    "vault_data" jsonb,
    "updated_at" timestamp with time zone,
    "nickname" text,
    "therapy_goals" text,
    "current_mood" text,
    "last_daily_reflection_at" timestamp with time zone,
    "locale" text
);


alter table "public"."user_vaults" enable row level security;

CREATE UNIQUE INDEX ai_decision_log_pkey ON public.ai_decision_log USING btree (id);

CREATE UNIQUE INDEX ai_decision_log_user_created_idx ON public.ai_decision_log USING btree (user_id, created_at);

CREATE UNIQUE INDEX ai_interactions_pkey ON public.ai_interactions USING btree (id);

CREATE UNIQUE INDEX ai_logs_pkey ON public.ai_logs USING btree (id);

CREATE UNIQUE INDEX ai_simulations_pkey ON public.ai_simulations USING btree (id);

CREATE UNIQUE INDEX analysis_reports_pkey ON public.analysis_reports USING btree (id);

CREATE INDEX analysis_reports_user_id_idx ON public.analysis_reports USING btree (user_id);

CREATE UNIQUE INDEX app_logs_pkey ON public.app_logs USING btree (id);

CREATE UNIQUE INDEX background_jobs_pkey ON public.background_jobs USING btree (id);

CREATE UNIQUE INDEX cognitive_memories_pkey ON public.cognitive_memories USING btree (id);

CREATE INDEX cognitive_memories_source_event_id_idx ON public.cognitive_memories USING btree (source_event_id);

CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id);

CREATE UNIQUE INDEX events_user_id_transaction_id_key ON public.events USING btree (user_id, transaction_id);

CREATE UNIQUE INDEX events_user_txid_uidx ON public.events USING btree (user_id, transaction_id) WHERE (transaction_id IS NOT NULL);

CREATE UNIQUE INDEX feature_usage_counters_pkey ON public.feature_usage_counters USING btree (user_id, feature, period, period_key);

CREATE INDEX idx_ai_decisions_user_time ON public.ai_decision_log USING btree (user_id, created_at DESC);

CREATE INDEX idx_ai_interactions_user ON public.ai_interactions USING btree (user_id);

CREATE INDEX idx_ai_logs_user_id ON public.ai_logs USING btree (user_id);

CREATE INDEX idx_ai_sim_user_time ON public.ai_simulations USING btree (user_id, generated_at DESC);

CREATE INDEX idx_app_logs_user_id ON public.app_logs USING btree (user_id);

CREATE INDEX idx_cognitive_memories_tx ON public.cognitive_memories USING btree (transaction_id);

CREATE INDEX idx_cognitive_memories_user_id ON public.cognitive_memories USING btree (user_id);

CREATE INDEX idx_cognitive_memories_user_id_event_time ON public.cognitive_memories USING btree (user_id, event_time DESC);

CREATE INDEX idx_events_user_id_type ON public.events USING btree (user_id, type);

CREATE INDEX idx_events_user_type_time ON public.events USING btree (user_id, type, created_at DESC);

CREATE INDEX idx_memories_content_embedding ON public.cognitive_memories USING ivfflat (content_embedding) WITH (lists='100');

CREATE INDEX idx_payment_history_user_id ON public.payment_history USING btree (user_id);

CREATE INDEX idx_pending_text_sessions_expires_at ON public.pending_text_sessions USING btree (expires_at);

CREATE INDEX idx_pred_outcomes_user_exp ON public.predicted_outcomes USING btree (user_id, expires_at);

CREATE INDEX idx_predicted_outcomes_user_id ON public.predicted_outcomes USING btree (user_id);

CREATE INDEX idx_rag_logs_user ON public.rag_invocation_logs USING btree (user_id);

CREATE INDEX idx_simulations_user_id ON public.simulations USING btree (user_id);

CREATE INDEX idx_system_logs_user ON public.system_logs USING btree (user_id);

CREATE INDEX idx_user_reports_user_id_generated_at ON public.user_reports USING btree (user_id, generated_at DESC);

CREATE INDEX idx_user_vaults_user_id ON public.user_vaults USING btree (user_id);

CREATE INDEX ix_feature_usage_lookup ON public.feature_usage_counters USING btree (user_id, feature, period, period_key);

CREATE UNIQUE INDEX journey_logs_pkey ON public.journey_logs USING btree (id);

CREATE INDEX journey_logs_user_id_idx ON public.journey_logs USING btree (user_id);

CREATE UNIQUE INDEX payment_history_pkey ON public.payment_history USING btree (id);

CREATE UNIQUE INDEX pending_text_sessions_pkey ON public.pending_text_sessions USING btree (id);

CREATE UNIQUE INDEX pending_text_sessions_user_id_key ON public.pending_text_sessions USING btree (user_id);

CREATE UNIQUE INDEX plan_feature_limits_pkey ON public.plan_feature_limits USING btree (plan_id, feature, period);

CREATE UNIQUE INDEX predicted_outcomes_pkey ON public.predicted_outcomes USING btree (id);

CREATE UNIQUE INDEX predicted_outcomes_user_id_generated_at_idx ON public.predicted_outcomes USING btree (user_id, generated_at);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX prompt_versions_pkey ON public.prompt_versions USING btree (id);

CREATE UNIQUE INDEX prompt_versions_prompt_id_version_key ON public.prompt_versions USING btree (prompt_id, version);

CREATE UNIQUE INDEX prompts_name_key ON public.prompts USING btree (name);

CREATE UNIQUE INDEX prompts_pkey ON public.prompts USING btree (id);

CREATE UNIQUE INDEX rag_invocation_logs_pkey ON public.rag_invocation_logs USING btree (id);

CREATE UNIQUE INDEX simulations_pkey ON public.simulations USING btree (id);

CREATE INDEX simulations_trigger_prediction_id_idx ON public.simulations USING btree (trigger_prediction_id);

CREATE UNIQUE INDEX simulations_user_id_created_at_idx ON public.simulations USING btree (user_id, created_at);

CREATE UNIQUE INDEX subscription_plans_name_key ON public.subscription_plans USING btree (name);

CREATE UNIQUE INDEX subscription_plans_pkey ON public.subscription_plans USING btree (id);

CREATE UNIQUE INDEX system_logs_pkey ON public.system_logs USING btree (id);

CREATE UNIQUE INDEX system_metrics_name_time_idx ON public.system_performance_metrics USING btree (metric_name, measured_at);

CREATE UNIQUE INDEX system_performance_metrics_pkey ON public.system_performance_metrics USING btree (id);

CREATE UNIQUE INDEX user_reports_pkey ON public.user_reports USING btree (id);

CREATE UNIQUE INDEX user_subscriptions_pkey ON public.user_subscriptions USING btree (id);

CREATE INDEX user_subscriptions_plan_id_idx ON public.user_subscriptions USING btree (plan_id);

CREATE UNIQUE INDEX user_traits_pkey ON public.user_traits USING btree (id);

CREATE UNIQUE INDEX user_traits_user_id_key ON public.user_traits USING btree (user_id);

CREATE UNIQUE INDEX user_vaults_pkey ON public.user_vaults USING btree (id);

CREATE UNIQUE INDEX user_vaults_user_id_key ON public.user_vaults USING btree (user_id);

CREATE UNIQUE INDEX ux_user_subscriptions_active ON public.user_subscriptions USING btree (user_id) WHERE (is_active = true);

CREATE UNIQUE INDEX weekly_report_unique_idx ON public.user_reports USING btree (user_id, get_iso_week_start(generated_at));

alter table "public"."ai_decision_log" add constraint "ai_decision_log_pkey" PRIMARY KEY using index "ai_decision_log_pkey";

alter table "public"."ai_interactions" add constraint "ai_interactions_pkey" PRIMARY KEY using index "ai_interactions_pkey";

alter table "public"."ai_logs" add constraint "ai_logs_pkey" PRIMARY KEY using index "ai_logs_pkey";

alter table "public"."ai_simulations" add constraint "ai_simulations_pkey" PRIMARY KEY using index "ai_simulations_pkey";

alter table "public"."analysis_reports" add constraint "analysis_reports_pkey" PRIMARY KEY using index "analysis_reports_pkey";

alter table "public"."app_logs" add constraint "app_logs_pkey" PRIMARY KEY using index "app_logs_pkey";

alter table "public"."background_jobs" add constraint "background_jobs_pkey" PRIMARY KEY using index "background_jobs_pkey";

alter table "public"."cognitive_memories" add constraint "cognitive_memories_pkey" PRIMARY KEY using index "cognitive_memories_pkey";

alter table "public"."events" add constraint "events_pkey" PRIMARY KEY using index "events_pkey";

alter table "public"."feature_usage_counters" add constraint "feature_usage_counters_pkey" PRIMARY KEY using index "feature_usage_counters_pkey";

alter table "public"."journey_logs" add constraint "journey_logs_pkey" PRIMARY KEY using index "journey_logs_pkey";

alter table "public"."payment_history" add constraint "payment_history_pkey" PRIMARY KEY using index "payment_history_pkey";

alter table "public"."pending_text_sessions" add constraint "pending_text_sessions_pkey" PRIMARY KEY using index "pending_text_sessions_pkey";

alter table "public"."plan_feature_limits" add constraint "plan_feature_limits_pkey" PRIMARY KEY using index "plan_feature_limits_pkey";

alter table "public"."predicted_outcomes" add constraint "predicted_outcomes_pkey" PRIMARY KEY using index "predicted_outcomes_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."prompt_versions" add constraint "prompt_versions_pkey" PRIMARY KEY using index "prompt_versions_pkey";

alter table "public"."prompts" add constraint "prompts_pkey" PRIMARY KEY using index "prompts_pkey";

alter table "public"."rag_invocation_logs" add constraint "rag_invocation_logs_pkey" PRIMARY KEY using index "rag_invocation_logs_pkey";

alter table "public"."simulations" add constraint "simulations_pkey" PRIMARY KEY using index "simulations_pkey";

alter table "public"."subscription_plans" add constraint "subscription_plans_pkey" PRIMARY KEY using index "subscription_plans_pkey";

alter table "public"."system_logs" add constraint "system_logs_pkey" PRIMARY KEY using index "system_logs_pkey";

alter table "public"."system_performance_metrics" add constraint "system_performance_metrics_pkey" PRIMARY KEY using index "system_performance_metrics_pkey";

alter table "public"."user_reports" add constraint "user_reports_pkey" PRIMARY KEY using index "user_reports_pkey";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_pkey" PRIMARY KEY using index "user_subscriptions_pkey";

alter table "public"."user_traits" add constraint "user_traits_pkey" PRIMARY KEY using index "user_traits_pkey";

alter table "public"."user_vaults" add constraint "user_vaults_pkey" PRIMARY KEY using index "user_vaults_pkey";

alter table "public"."ai_decision_log" add constraint "ai_decision_log_complexity_level_check" CHECK ((complexity_level = ANY (ARRAY['simple'::text, 'medium'::text, 'complex'::text]))) not valid;

alter table "public"."ai_decision_log" validate constraint "ai_decision_log_complexity_level_check";

alter table "public"."ai_decision_log" add constraint "ai_decision_log_confidence_level_check" CHECK (((confidence_level >= (0)::numeric) AND (confidence_level <= (1)::numeric))) not valid;

alter table "public"."ai_decision_log" validate constraint "ai_decision_log_confidence_level_check";

alter table "public"."ai_decision_log" add constraint "ai_decision_log_user_created_idx" UNIQUE using index "ai_decision_log_user_created_idx";

alter table "public"."ai_decision_log" add constraint "ai_decision_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."ai_decision_log" validate constraint "ai_decision_log_user_id_fkey";

alter table "public"."ai_decision_log" add constraint "ai_decision_log_user_satisfaction_score_check" CHECK (((user_satisfaction_score = 1) OR (user_satisfaction_score = '-1'::integer))) not valid;

alter table "public"."ai_decision_log" validate constraint "ai_decision_log_user_satisfaction_score_check";

alter table "public"."ai_logs" add constraint "ai_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."ai_logs" validate constraint "ai_logs_user_id_fkey";

alter table "public"."ai_simulations" add constraint "fk_sim_user" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."ai_simulations" validate constraint "fk_sim_user";

alter table "public"."analysis_reports" add constraint "analysis_reports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."analysis_reports" validate constraint "analysis_reports_user_id_fkey";

alter table "public"."app_logs" add constraint "app_logs_log_level_check" CHECK ((log_level = ANY (ARRAY['INFO'::text, 'WARN'::text, 'ERROR'::text, 'DEBUG'::text]))) not valid;

alter table "public"."app_logs" validate constraint "app_logs_log_level_check";

alter table "public"."app_logs" add constraint "app_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."app_logs" validate constraint "app_logs_user_id_fkey";

alter table "public"."background_jobs" add constraint "background_jobs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."background_jobs" validate constraint "background_jobs_user_id_fkey";

alter table "public"."cognitive_memories" add constraint "cognitive_memories_source_event_id_fkey" FOREIGN KEY (source_event_id) REFERENCES events(id) ON DELETE CASCADE not valid;

alter table "public"."cognitive_memories" validate constraint "cognitive_memories_source_event_id_fkey";

alter table "public"."cognitive_memories" add constraint "cognitive_memories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."cognitive_memories" validate constraint "cognitive_memories_user_id_fkey";

alter table "public"."events" add constraint "events_user_id_transaction_id_key" UNIQUE using index "events_user_id_transaction_id_key";

alter table "public"."feature_usage_counters" add constraint "feature_usage_counters_feature_check" CHECK ((feature = ANY (ARRAY['text_sessions'::text, 'dream_analysis'::text, 'diary_write'::text, 'daily_reflection'::text, 'ai_reports'::text, 'voice_minutes'::text]))) not valid;

alter table "public"."feature_usage_counters" validate constraint "feature_usage_counters_feature_check";

alter table "public"."feature_usage_counters" add constraint "feature_usage_counters_period_check" CHECK ((period = ANY (ARRAY['day'::text, 'month'::text]))) not valid;

alter table "public"."feature_usage_counters" validate constraint "feature_usage_counters_period_check";

alter table "public"."feature_usage_counters" add constraint "feature_usage_counters_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."feature_usage_counters" validate constraint "feature_usage_counters_user_id_fkey";

alter table "public"."journey_logs" add constraint "journey_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."journey_logs" validate constraint "journey_logs_user_id_fkey";

alter table "public"."payment_history" add constraint "payment_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."payment_history" validate constraint "payment_history_user_id_fkey";

alter table "public"."pending_text_sessions" add constraint "pending_text_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."pending_text_sessions" validate constraint "pending_text_sessions_user_id_fkey";

alter table "public"."pending_text_sessions" add constraint "pending_text_sessions_user_id_key" UNIQUE using index "pending_text_sessions_user_id_key";

alter table "public"."plan_feature_limits" add constraint "plan_feature_limits_feature_check" CHECK ((feature = ANY (ARRAY['text_sessions'::text, 'dream_analysis'::text, 'diary_write'::text, 'daily_reflection'::text, 'ai_reports'::text, 'voice_minutes'::text]))) not valid;

alter table "public"."plan_feature_limits" validate constraint "plan_feature_limits_feature_check";

alter table "public"."plan_feature_limits" add constraint "plan_feature_limits_period_check" CHECK ((period = ANY (ARRAY['day'::text, 'month'::text]))) not valid;

alter table "public"."plan_feature_limits" validate constraint "plan_feature_limits_period_check";

alter table "public"."plan_feature_limits" add constraint "plan_feature_limits_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE not valid;

alter table "public"."plan_feature_limits" validate constraint "plan_feature_limits_plan_id_fkey";

alter table "public"."predicted_outcomes" add constraint "predicted_outcomes_prediction_type_check" CHECK ((prediction_type = ANY (ARRAY['trigger_risk'::text, 'mood_forecast'::text, 'behavior_pattern'::text]))) not valid;

alter table "public"."predicted_outcomes" validate constraint "predicted_outcomes_prediction_type_check";

alter table "public"."predicted_outcomes" add constraint "predicted_outcomes_probability_score_check" CHECK (((probability_score >= 0.1) AND (probability_score <= 0.9))) not valid;

alter table "public"."predicted_outcomes" validate constraint "predicted_outcomes_probability_score_check";

alter table "public"."predicted_outcomes" add constraint "predicted_outcomes_user_feedback_check" CHECK ((user_feedback = ANY (ARRAY['-1'::integer, 0, 1]))) not valid;

alter table "public"."predicted_outcomes" validate constraint "predicted_outcomes_user_feedback_check";

alter table "public"."predicted_outcomes" add constraint "predicted_outcomes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."predicted_outcomes" validate constraint "predicted_outcomes_user_id_fkey";

alter table "public"."predicted_outcomes" add constraint "predicted_outcomes_user_id_generated_at_idx" UNIQUE using index "predicted_outcomes_user_id_generated_at_idx";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."prompt_versions" add constraint "prompt_versions_prompt_id_fkey" FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE not valid;

alter table "public"."prompt_versions" validate constraint "prompt_versions_prompt_id_fkey";

alter table "public"."prompt_versions" add constraint "prompt_versions_prompt_id_version_key" UNIQUE using index "prompt_versions_prompt_id_version_key";

alter table "public"."prompts" add constraint "prompts_name_key" UNIQUE using index "prompts_name_key";

alter table "public"."simulations" add constraint "simulations_confidence_score_check" CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric))) not valid;

alter table "public"."simulations" validate constraint "simulations_confidence_score_check";

alter table "public"."simulations" add constraint "simulations_trigger_prediction_id_fkey" FOREIGN KEY (trigger_prediction_id) REFERENCES predicted_outcomes(id) not valid;

alter table "public"."simulations" validate constraint "simulations_trigger_prediction_id_fkey";

alter table "public"."simulations" add constraint "simulations_user_feedback_check" CHECK ((user_feedback = ANY (ARRAY['-1'::integer, 0, 1]))) not valid;

alter table "public"."simulations" validate constraint "simulations_user_feedback_check";

alter table "public"."simulations" add constraint "simulations_user_id_created_at_idx" UNIQUE using index "simulations_user_id_created_at_idx";

alter table "public"."simulations" add constraint "simulations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."simulations" validate constraint "simulations_user_id_fkey";

alter table "public"."subscription_plans" add constraint "subscription_plans_name_key" UNIQUE using index "subscription_plans_name_key";

alter table "public"."system_logs" add constraint "system_logs_log_level_check" CHECK ((log_level = ANY (ARRAY['INFO'::text, 'WARN'::text, 'ERROR'::text]))) not valid;

alter table "public"."system_logs" validate constraint "system_logs_log_level_check";

alter table "public"."system_performance_metrics" add constraint "system_metrics_name_time_idx" UNIQUE using index "system_metrics_name_time_idx";

alter table "public"."system_performance_metrics" add constraint "system_performance_metrics_trend_direction_check" CHECK ((trend_direction = ANY (ARRAY['improving'::text, 'stable'::text, 'degrading'::text]))) not valid;

alter table "public"."system_performance_metrics" validate constraint "system_performance_metrics_trend_direction_check";

alter table "public"."user_reports" add constraint "user_reports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_reports" validate constraint "user_reports_user_id_fkey";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE not valid;

alter table "public"."user_subscriptions" validate constraint "user_subscriptions_plan_id_fkey";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_subscriptions" validate constraint "user_subscriptions_user_id_fkey";

alter table "public"."user_traits" add constraint "user_traits_anxiety_level_check" CHECK (((anxiety_level >= (0)::numeric) AND (anxiety_level <= (1)::numeric))) not valid;

alter table "public"."user_traits" validate constraint "user_traits_anxiety_level_check";

alter table "public"."user_traits" add constraint "user_traits_confidence_check" CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))) not valid;

alter table "public"."user_traits" validate constraint "user_traits_confidence_check";

alter table "public"."user_traits" add constraint "user_traits_motivation_check" CHECK (((motivation >= (0)::numeric) AND (motivation <= (1)::numeric))) not valid;

alter table "public"."user_traits" validate constraint "user_traits_motivation_check";

alter table "public"."user_traits" add constraint "user_traits_neuroticism_check" CHECK (((neuroticism >= (0)::numeric) AND (neuroticism <= (1)::numeric))) not valid;

alter table "public"."user_traits" validate constraint "user_traits_neuroticism_check";

alter table "public"."user_traits" add constraint "user_traits_openness_check" CHECK (((openness >= (0)::numeric) AND (openness <= (1)::numeric))) not valid;

alter table "public"."user_traits" validate constraint "user_traits_openness_check";

alter table "public"."user_traits" add constraint "user_traits_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_traits" validate constraint "user_traits_user_id_fkey";

alter table "public"."user_traits" add constraint "user_traits_user_id_key" UNIQUE using index "user_traits_user_id_key";

alter table "public"."user_vaults" add constraint "user_vaults_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_vaults" validate constraint "user_vaults_user_id_fkey";

alter table "public"."user_vaults" add constraint "user_vaults_user_id_key" UNIQUE using index "user_vaults_user_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.assign_free_plan_to_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
    free_plan_id UUID;
BEGIN
    -- 'Free' isimli planın ID'sini dinamik olarak al (Bu kısım çok iyi, böyle kalsın)
    SELECT id INTO free_plan_id FROM public.subscription_plans WHERE name = 'Free' LIMIT 1;
    
    -- Ücretsiz plan bulunamazsa, kullanıcı kaydını engelleme (Bu da çok iyi, kalsın)
    IF free_plan_id IS NULL THEN
        RAISE WARNING 'Yeni kullanıcı için "Free" planı bulunamadı, abonelik oluşturulmadı.';
        RETURN NEW;
    END IF;
    
    -- <<-- DÜZELTME BURADA BAŞLIYOR -->>
    -- Hatalı 'status' sütunu yerine, tablanda var olan 'is_active' sütununu kullanıyoruz.
    -- Değer olarak da 'active' metni yerine 'true' boolean değerini veriyoruz.
    -- 'starts_at' sütununu da tablodaki haline ('started_at') göre güncelledim.
    INSERT INTO public.user_subscriptions (user_id, plan_id, is_active, started_at)
    VALUES (NEW.id, free_plan_id, true, NOW());
    
    RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.assign_plan_for_user(user_id_to_update uuid, plan_name_to_assign character varying)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    target_plan_id UUID;
    target_plan_duration INTEGER;
BEGIN
    -- DÜZELTİLDİ: public. şeması eklendi
    SELECT id, duration_days INTO target_plan_id, target_plan_duration 
    FROM public.subscription_plans WHERE name = plan_name_to_assign LIMIT 1;

    IF target_plan_id IS NULL THEN
        RAISE EXCEPTION 'Plan not found: %', plan_name_to_assign;
    END IF;

    -- DÜZELTİLDİ: public. şeması eklendi
    UPDATE public.user_subscriptions
    SET status = 'cancelled', auto_renew = false, updated_at = NOW()
    WHERE user_id = user_id_to_update AND status = 'active';

    -- DÜZELTİLDİ: public. şeması eklendi
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, starts_at, ends_at, auto_renew)
    VALUES (
        user_id_to_update, 
        target_plan_id, 
        'active', 
        NOW(), 
        NOW() + (target_plan_duration || ' days')::INTERVAL,
        true
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_plan_to_user(p_user_id uuid, p_plan_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan_id uuid;
begin
  -- 1. İstenen planın ID'sini bul.
  select id into v_plan_id from public.subscription_plans where name = p_plan_name;

  if v_plan_id is null then
    raise exception 'Geçersiz plan adı: %', p_plan_name;
  end if;

  -- 2. Kullanıcının mevcut AKTİF aboneliğini bul ve deaktif et.
  update public.user_subscriptions
  set is_active = false,
      ends_at = now()
  where user_id = p_user_id and is_active = true;

  -- 3. Kullanıcıya yeni AKTİF aboneliği ata.
  insert into public.user_subscriptions(user_id, plan_id, is_active, started_at)
  values (p_user_id, v_plan_id, true, now());
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_feature_usage(user_uuid uuid, feature_name text)
 RETURNS TABLE(can_use boolean, used_count integer, limit_count integer, period text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_plan_id uuid;
  v_plan_name text;
  v_limit integer;
  v_period text;
  v_key text;
  v_used integer;
begin
  select plan_id, name into v_plan_id, v_plan_name
  from get_user_current_subscription(user_uuid);

  select pfl.limit_count, pfl.period
  into v_limit, v_period
  from plan_feature_limits pfl
  where pfl.plan_id = v_plan_id
    and pfl.feature = feature_name
  limit 1;

  if v_limit is null then
    v_limit := 0;
    v_period := 'month';
  end if;

  v_key := feature_period_key(v_period, now());

  select fuc.used_count into v_used
  from feature_usage_counters fuc
  where fuc.user_id = user_uuid
    and fuc.feature = feature_name
    and fuc.period = v_period
    and fuc.period_key = v_key;

  v_used := coalesce(v_used, 0);

  if v_limit = -1 then
    return query select true, v_used, v_limit, v_period;
  else
    return query select (v_used < v_limit), v_used, v_limit, v_period;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_feature_usage(user_uuid uuid, feature_name_base character varying)
 RETURNS TABLE(can_use boolean, used_count integer, limit_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    current_subscription RECORD;
    usage_record RECORD;
    feature_limit INTEGER;
    reset_date_value DATE;
    reset_type_value VARCHAR(20);
    actual_feature_name VARCHAR(100);
BEGIN
   
    SELECT * INTO current_subscription FROM get_user_current_subscription(user_uuid) LIMIT 1;
    
    
    IF current_subscription IS NULL THEN
        SELECT features INTO current_subscription FROM subscription_plans WHERE name = 'Free' LIMIT 1;
    END IF;

    
    IF (current_subscription.features ->> (feature_name_base || '_daily')) IS NOT NULL THEN
        actual_feature_name := feature_name_base || '_daily';
        reset_type_value := 'daily';
        reset_date_value := CURRENT_DATE;
        feature_limit := (current_subscription.features ->> actual_feature_name)::INTEGER;
    ELSIF (current_subscription.features ->> (feature_name_base || '_weekly')) IS NOT NULL THEN
        actual_feature_name := feature_name_base || '_weekly';
        reset_type_value := 'weekly';
        reset_date_value := date_trunc('week', CURRENT_DATE)::DATE;
        feature_limit := (current_subscription.features ->> actual_feature_name)::INTEGER;
    ELSIF (current_subscription.features ->> (feature_name_base || '_monthly')) IS NOT NULL THEN
        actual_feature_name := feature_name_base || '_monthly';
        reset_type_value := 'monthly';
        reset_date_value := date_trunc('month', CURRENT_DATE)::DATE;
        feature_limit := (current_subscription.features ->> actual_feature_name)::INTEGER;
    ELSE
        
        RETURN QUERY SELECT false, 0, 0;
        RETURN;
    END IF;
    
    
    IF feature_limit = -1 THEN
        RETURN QUERY SELECT true, 0, -1;
        RETURN;
    END IF;

    IF feature_limit = 0 THEN
        RETURN QUERY SELECT false, 0, 0;
        RETURN;
    END IF;
    
    
    INSERT INTO usage_tracking (user_id, feature_type, used_count, limit_count, reset_date, reset_type)
    VALUES (user_uuid, actual_feature_name, 0, feature_limit, reset_date_value, reset_type_value)
    ON CONFLICT (user_id, feature_type, reset_date) DO NOTHING;
    
    SELECT * INTO usage_record FROM usage_tracking 
    WHERE user_id = user_uuid AND feature_type = actual_feature_name AND reset_date = reset_date_value;
    
    RETURN QUERY SELECT 
        (usage_record.used_count < usage_record.limit_count),
        usage_record.used_count,
        usage_record.limit_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM public.pending_text_sessions 
    WHERE expires_at < NOW();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.consume_dream_analysis(p_user_id uuid)
 RETURNS TABLE(allowed boolean, used integer, remaining integer, limit_count integer, reset_date date, plan_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan text;
BEGIN
  -- Plan adını oku; yoksa 'Free'
  SELECT cps.plan_name
    INTO v_plan
  FROM public.current_plan_status AS cps
  WHERE cps.user_id = p_user_id
  LIMIT 1;

  v_plan := COALESCE(v_plan, 'Free');

  -- Her zaman izin ver; sayıları “çok yüksek limit” gibi veriyoruz
  RETURN QUERY
  SELECT
    TRUE       AS allowed,
    0          AS used,
    1000000    AS remaining,
    1000000    AS limit_count,
    CURRENT_DATE AS reset_date,
    v_plan     AS plan_name;
END
$function$
;

CREATE OR REPLACE FUNCTION public.consume_dream_analysis_json(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT to_jsonb(t)
  FROM public.consume_dream_analysis(p_user_id) AS t
$function$
;

CREATE OR REPLACE FUNCTION public.consume_feature(user_uuid uuid, feature_name text, amount integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_can boolean;
  v_used integer;
  v_limit integer;
  v_period text;
  v_key text;
  v_new_used integer;
begin
  select can_use, used_count, limit_count, period
  into v_can, v_used, v_limit, v_period
  from check_feature_usage(user_uuid, feature_name);

  v_key := feature_period_key(v_period, now());

  if v_limit = -1 then
    -- sınırsız; yine de sayaç tutmak istiyorsan aşağıyı aç:
    insert into feature_usage_counters(user_id, feature, period, period_key, used_count)
      values (user_uuid, feature_name, v_period, v_key, 0)
    on conflict (user_id, feature, period, period_key) do nothing;
    update feature_usage_counters
      set used_count = feature_usage_counters.used_count + amount,
          updated_at = now()
      where user_id = user_uuid and feature = feature_name and period = v_period and period_key = v_key;
    return;
  end if;

  if v_used + amount > v_limit then
    raise exception 'quota_exceeded' using hint = 'Feature limit exceeded', errcode = 'P0001';
  end if;

  insert into feature_usage_counters(user_id, feature, period, period_key, used_count)
    values (user_uuid, feature_name, v_period, v_key, amount)
  on conflict (user_id, feature, period, period_key)
  do update set used_count = feature_usage_counters.used_count + excluded.used_count,
                 updated_at = now();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.feature_period_key(p_period text, p_now timestamp with time zone DEFAULT now())
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select case
    when lower(p_period) = 'day' then to_char(p_now at time zone 'UTC','YYYY-MM-DD')
    when lower(p_period) = 'month' then to_char(p_now at time zone 'UTC','YYYY-MM')
    else 'invalid'
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_prompt_by_name(p_name text)
 RETURNS TABLE(content text, metadata jsonb, version integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    pv.content,
    pv.metadata,
    pv.version
  FROM prompt_versions pv
  JOIN prompts p ON pv.prompt_id = p.id
  WHERE p.name = p_name AND pv.version = p.active_version;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_effective_plan(p_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (
      SELECT sp.name
      FROM public.user_subscriptions us
      JOIN public.subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = p_user_id
        AND us.status IN ('active','trialing')
        AND us.starts_at <= NOW()
        AND us.ends_at   >  NOW()
      ORDER BY us.ends_at DESC
      LIMIT 1
    ),
    'Free'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_iso_week_start(ts timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT date_trunc('week', ts)::date;
$function$
;

CREATE OR REPLACE FUNCTION public.get_plan_name(p_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (
      SELECT sp.name
      FROM public.user_subscriptions us
      LEFT JOIN public.subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = p_user_id
      ORDER BY us.ends_at DESC
      LIMIT 1
    ),
    'Free'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_plan_status(p_user_id uuid)
 RETURNS TABLE(plan_name text, effective_status text, ends_at timestamp with time zone, days_left integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH cur AS (
    SELECT us.ends_at, sp.name
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND us.status IN ('active','trialing')
      AND NOW() BETWEEN us.starts_at AND us.ends_at
    ORDER BY us.ends_at DESC
    LIMIT 1
  )
  SELECT
    COALESCE((SELECT name FROM cur), 'Free') AS plan_name,
    CASE WHEN EXISTS (SELECT 1 FROM cur) THEN 'active' ELSE 'free' END AS effective_status,
    (SELECT ends_at FROM cur) AS ends_at,
    COALESCE(CEIL(EXTRACT(EPOCH FROM(((SELECT ends_at FROM cur) - NOW())))/86400.0)::int, 0) AS days_left;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_current_subscription(user_uuid uuid)
 RETURNS TABLE(plan_id uuid, name text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_plan_id uuid;
  v_name text;
begin
  select sp.id, sp.name
  into v_plan_id, v_name
  from user_subscriptions us
  join subscription_plans sp on sp.id = us.plan_id
  where us.user_id = user_uuid
    and us.is_active = true
    and (us.ends_at is null or us.ends_at > now())
  order by us.started_at desc
  limit 1;

  if v_plan_id is null then
    select id, name into v_plan_id, v_name
    from subscription_plans where name = 'Free' limit 1;
  end if;

  return query select v_plan_id, v_name;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_users_for_trait_analysis()
 RETURNS TABLE(user_id uuid)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT e.user_id
    FROM public.events e
    WHERE e.created_at >= (now() - interval '7 days')
    GROUP BY e.user_id
    HAVING count(e.id) >= 5; -- Son 7 günde en az 5 olayı olanlar
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_users_for_trait_analysis(limit_count integer, offset_count integer)
 RETURNS TABLE(user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT id::UUID FROM auth.users
    ORDER BY created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, nickname)
  values (new.id, new.raw_user_meta_data->>'nickname');
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 'options.data' ile gönderilen 'locale' bilgisini yeni sütuna YAZIYORUZ.
  INSERT INTO public.user_vaults (user_id, nickname, locale, vault_data)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'nickname',
    new.raw_user_meta_data ->> 'locale', -- DİLİ BURADAN ALIYORUZ
    jsonb_build_object(
        'profile', jsonb_build_object('nickname', new.raw_user_meta_data ->> 'nickname'),
        'metadata', jsonb_build_object(
            'onboardingCompleted', true,
            'locale', new.raw_user_meta_data ->> 'locale' -- Metadataya da ekliyoruz
        )
    )
  );

  -- 'onboarding_completed' event'inin içine de o anki dili ekliyoruz.
  -- Bu, AI'ın hangi dilde analiz yapacağını bilmesi için KRİTİKTİR.
  INSERT INTO public.events (user_id, type, data)
  VALUES (
    new.id,
    'onboarding_completed',
    jsonb_build_object(
        'answers', new.raw_user_meta_data -> 'onboarding_answers',
        'language', new.raw_user_meta_data ->> 'locale' -- EVENT'E DE DİLİ EKLİYORUZ
    )
  );

  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_premium_access(user_uuid uuid, feature_name character varying)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    current_subscription RECORD;
    feature_value JSONB;
BEGIN
    SELECT * INTO current_subscription FROM get_user_current_subscription(user_uuid) LIMIT 1;
    
    IF current_subscription IS NULL THEN
        SELECT features INTO current_subscription FROM subscription_plans WHERE name = 'Free' LIMIT 1;
    END IF;
    

    feature_value := current_subscription.features -> feature_name;
    
    IF feature_value IS NULL THEN
        RETURN FALSE;
    END IF;
    

    IF jsonb_typeof(feature_value) = 'boolean' THEN
        RETURN feature_value::BOOLEAN;
    END IF;
    

    IF jsonb_typeof(feature_value) = 'number' THEN
        RETURN (feature_value::INTEGER) != 0;
    END IF;
    
    RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_feature_usage(user_uuid uuid, feature_name text, increment_val integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO usage_stats (user_id, feature, count, used_count)
    VALUES (user_uuid, feature_name, GREATEST(0, increment_val), GREATEST(0, increment_val))
    ON CONFLICT (user_id, feature) 
    DO UPDATE SET 
        count = GREATEST(0, usage_stats.count + increment_val),
        used_count = GREATEST(0, usage_stats.used_count + increment_val),
        updated_at = NOW();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_traits_to_timeseries()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    trait_record RECORD;
BEGIN
    -- 'traits' objesi yoksa veya boşsa, işlemi sonlandır.
    IF NOT (NEW.vault_data ? 'traits') OR jsonb_typeof(NEW.vault_data->'traits') != 'object' THEN
        RETURN NEW;
    END IF;

    -- 'traits' objesindeki her bir key-value çifti için döngüye gir.
    FOR trait_record IN SELECT * FROM jsonb_each(NEW.vault_data->'traits')
    LOOP
        INSERT INTO public.user_trait_over_time (user_id, timestamp, trait_key, numeric_value, text_value)
        VALUES (
            NEW.user_id,
            NOW(), -- İşlemin yapıldığı an
            trait_record.key,
            CASE -- Değer sayısal mı diye kontrol et
                WHEN jsonb_typeof(trait_record.value) = 'number' THEN (trait_record.value)::double precision
                ELSE NULL
            END,
            CASE -- Değer metinsel mi diye kontrol et
                WHEN jsonb_typeof(trait_record.value) = 'string' THEN trait_record.value #>> '{}' -- JSONB tırnaklarını temizle
                ELSE NULL
            END
        );
    END LOOP;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_documents(query_embedding extensions.vector, match_count integer, filter jsonb)
 RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
#variable_conflict use_variable
BEGIN
  RETURN QUERY
  SELECT
    mem.id,
    mem.content,
    mem.metadata,
    1 - (mem.embedding <=> query_embedding) AS similarity
  FROM
    memory_embeddings AS mem
  WHERE
    -- LangChain'in gönderdiği 'filter' objesindeki 'user_id'yi bizim tablomuzdaki 'user_id' ile eşleştiriyoruz.
    mem.user_id = (filter->>'user_id')::uuid
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_memories(query_embedding extensions.vector, match_threshold double precision, match_count integer, p_user_id uuid, start_date timestamp with time zone)
 RETURNS TABLE(id uuid, content text, event_time timestamp with time zone, similarity double precision)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.content,
    cm.event_time,
    1 - (cm.content_embedding <=> query_embedding) AS similarity
  FROM
    cognitive_memories AS cm
  WHERE
    cm.user_id = p_user_id
    AND cm.event_time >= start_date -- YENİ FİLTRELEME SATIRI
    AND 1 - (cm.content_embedding <=> query_embedding) > match_threshold
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_dream_feedback(event_id_to_update uuid, feedback_score integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.events
  SET
    data = data || jsonb_build_object('feedback', jsonb_build_object('score', feedback_score, 'timestamp', now()))
  WHERE
    id = event_id_to_update AND auth.uid() = user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_oracle_result(event_id_to_update uuid, oracle_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.events
  SET
    data = data || jsonb_build_object('oracle_result', oracle_data)
  WHERE
    id = event_id_to_update AND auth.uid() = user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_ai_emotional_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.state_snapshot_at = NOW();
    IF OLD.dominant_mood != NEW.dominant_mood THEN
        NEW.last_mood_change_at = NOW();
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_ai_learning_patterns_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_premium_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.status = 'active' THEN
        UPDATE usage_stats 
        SET limit_count = CASE 
            WHEN (SELECT name FROM subscription_plans WHERE id = NEW.plan_id) = 'Premium' THEN 999
            WHEN (SELECT name FROM subscription_plans WHERE id = NEW.plan_id) = '+Plus' THEN 10
            ELSE 3
        END
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_trait_with_ema(p_user_id uuid, p_trait_key text, p_new_value double precision, p_alpha double precision DEFAULT 0.1)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_current_value FLOAT; v_new_average FLOAT;
BEGIN
    SELECT (vault_data->'traits'->>p_trait_key)::float INTO v_current_value FROM public.user_vaults WHERE user_id = p_user_id;
    IF v_current_value IS NULL THEN v_new_average := p_new_value; ELSE v_new_average := (p_alpha * p_new_value) + ((1 - p_alpha) * v_current_value); END IF;
    UPDATE public.user_vaults SET vault_data = jsonb_set(COALESCE(vault_data, '{}'::jsonb), ARRAY['traits', p_trait_key], to_jsonb(v_new_average), true) WHERE user_id = p_user_id;
    IF NOT FOUND THEN INSERT INTO public.user_vaults (user_id, vault_data) VALUES (p_user_id, jsonb_build_object('traits', jsonb_build_object(p_trait_key, v_new_average))); END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_vault_field(p_user_id uuid, p_field_key text, p_field_value jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  UPDATE public.user_vaults
  SET
    vault_data = jsonb_set(
      COALESCE(vault_data, '{}'::jsonb),
      ARRAY[p_field_key],
      p_field_value,
      true
    ),
    updated_at = now()
  WHERE
    user_id = p_user_id;

  -- Eğer kullanıcı için henüz bir vault yoksa, oluştur.
  IF NOT FOUND THEN
    INSERT INTO public.user_vaults (user_id, vault_data)
    VALUES (p_user_id, jsonb_build_object(p_field_key, p_field_value));
  END IF;
END;
$function$
;

grant delete on table "public"."ai_decision_log" to "anon";

grant insert on table "public"."ai_decision_log" to "anon";

grant references on table "public"."ai_decision_log" to "anon";

grant select on table "public"."ai_decision_log" to "anon";

grant trigger on table "public"."ai_decision_log" to "anon";

grant truncate on table "public"."ai_decision_log" to "anon";

grant update on table "public"."ai_decision_log" to "anon";

grant delete on table "public"."ai_decision_log" to "authenticated";

grant insert on table "public"."ai_decision_log" to "authenticated";

grant references on table "public"."ai_decision_log" to "authenticated";

grant select on table "public"."ai_decision_log" to "authenticated";

grant trigger on table "public"."ai_decision_log" to "authenticated";

grant truncate on table "public"."ai_decision_log" to "authenticated";

grant update on table "public"."ai_decision_log" to "authenticated";

grant delete on table "public"."ai_decision_log" to "service_role";

grant insert on table "public"."ai_decision_log" to "service_role";

grant references on table "public"."ai_decision_log" to "service_role";

grant select on table "public"."ai_decision_log" to "service_role";

grant trigger on table "public"."ai_decision_log" to "service_role";

grant truncate on table "public"."ai_decision_log" to "service_role";

grant update on table "public"."ai_decision_log" to "service_role";

grant delete on table "public"."ai_interactions" to "anon";

grant insert on table "public"."ai_interactions" to "anon";

grant references on table "public"."ai_interactions" to "anon";

grant select on table "public"."ai_interactions" to "anon";

grant trigger on table "public"."ai_interactions" to "anon";

grant truncate on table "public"."ai_interactions" to "anon";

grant update on table "public"."ai_interactions" to "anon";

grant delete on table "public"."ai_interactions" to "authenticated";

grant insert on table "public"."ai_interactions" to "authenticated";

grant references on table "public"."ai_interactions" to "authenticated";

grant select on table "public"."ai_interactions" to "authenticated";

grant trigger on table "public"."ai_interactions" to "authenticated";

grant truncate on table "public"."ai_interactions" to "authenticated";

grant update on table "public"."ai_interactions" to "authenticated";

grant delete on table "public"."ai_interactions" to "service_role";

grant insert on table "public"."ai_interactions" to "service_role";

grant references on table "public"."ai_interactions" to "service_role";

grant select on table "public"."ai_interactions" to "service_role";

grant trigger on table "public"."ai_interactions" to "service_role";

grant truncate on table "public"."ai_interactions" to "service_role";

grant update on table "public"."ai_interactions" to "service_role";

grant delete on table "public"."ai_logs" to "anon";

grant insert on table "public"."ai_logs" to "anon";

grant references on table "public"."ai_logs" to "anon";

grant select on table "public"."ai_logs" to "anon";

grant trigger on table "public"."ai_logs" to "anon";

grant truncate on table "public"."ai_logs" to "anon";

grant update on table "public"."ai_logs" to "anon";

grant delete on table "public"."ai_logs" to "authenticated";

grant insert on table "public"."ai_logs" to "authenticated";

grant references on table "public"."ai_logs" to "authenticated";

grant select on table "public"."ai_logs" to "authenticated";

grant trigger on table "public"."ai_logs" to "authenticated";

grant truncate on table "public"."ai_logs" to "authenticated";

grant update on table "public"."ai_logs" to "authenticated";

grant delete on table "public"."ai_logs" to "service_role";

grant insert on table "public"."ai_logs" to "service_role";

grant references on table "public"."ai_logs" to "service_role";

grant select on table "public"."ai_logs" to "service_role";

grant trigger on table "public"."ai_logs" to "service_role";

grant truncate on table "public"."ai_logs" to "service_role";

grant update on table "public"."ai_logs" to "service_role";

grant delete on table "public"."ai_simulations" to "anon";

grant insert on table "public"."ai_simulations" to "anon";

grant references on table "public"."ai_simulations" to "anon";

grant select on table "public"."ai_simulations" to "anon";

grant trigger on table "public"."ai_simulations" to "anon";

grant truncate on table "public"."ai_simulations" to "anon";

grant update on table "public"."ai_simulations" to "anon";

grant delete on table "public"."ai_simulations" to "authenticated";

grant insert on table "public"."ai_simulations" to "authenticated";

grant references on table "public"."ai_simulations" to "authenticated";

grant select on table "public"."ai_simulations" to "authenticated";

grant trigger on table "public"."ai_simulations" to "authenticated";

grant truncate on table "public"."ai_simulations" to "authenticated";

grant update on table "public"."ai_simulations" to "authenticated";

grant delete on table "public"."ai_simulations" to "service_role";

grant insert on table "public"."ai_simulations" to "service_role";

grant references on table "public"."ai_simulations" to "service_role";

grant select on table "public"."ai_simulations" to "service_role";

grant trigger on table "public"."ai_simulations" to "service_role";

grant truncate on table "public"."ai_simulations" to "service_role";

grant update on table "public"."ai_simulations" to "service_role";

grant delete on table "public"."analysis_reports" to "anon";

grant insert on table "public"."analysis_reports" to "anon";

grant references on table "public"."analysis_reports" to "anon";

grant select on table "public"."analysis_reports" to "anon";

grant trigger on table "public"."analysis_reports" to "anon";

grant truncate on table "public"."analysis_reports" to "anon";

grant update on table "public"."analysis_reports" to "anon";

grant delete on table "public"."analysis_reports" to "authenticated";

grant insert on table "public"."analysis_reports" to "authenticated";

grant references on table "public"."analysis_reports" to "authenticated";

grant select on table "public"."analysis_reports" to "authenticated";

grant trigger on table "public"."analysis_reports" to "authenticated";

grant truncate on table "public"."analysis_reports" to "authenticated";

grant update on table "public"."analysis_reports" to "authenticated";

grant delete on table "public"."analysis_reports" to "service_role";

grant insert on table "public"."analysis_reports" to "service_role";

grant references on table "public"."analysis_reports" to "service_role";

grant select on table "public"."analysis_reports" to "service_role";

grant trigger on table "public"."analysis_reports" to "service_role";

grant truncate on table "public"."analysis_reports" to "service_role";

grant update on table "public"."analysis_reports" to "service_role";

grant delete on table "public"."app_logs" to "anon";

grant insert on table "public"."app_logs" to "anon";

grant references on table "public"."app_logs" to "anon";

grant select on table "public"."app_logs" to "anon";

grant trigger on table "public"."app_logs" to "anon";

grant truncate on table "public"."app_logs" to "anon";

grant update on table "public"."app_logs" to "anon";

grant delete on table "public"."app_logs" to "authenticated";

grant insert on table "public"."app_logs" to "authenticated";

grant references on table "public"."app_logs" to "authenticated";

grant select on table "public"."app_logs" to "authenticated";

grant trigger on table "public"."app_logs" to "authenticated";

grant truncate on table "public"."app_logs" to "authenticated";

grant update on table "public"."app_logs" to "authenticated";

grant delete on table "public"."app_logs" to "service_role";

grant insert on table "public"."app_logs" to "service_role";

grant references on table "public"."app_logs" to "service_role";

grant select on table "public"."app_logs" to "service_role";

grant trigger on table "public"."app_logs" to "service_role";

grant truncate on table "public"."app_logs" to "service_role";

grant update on table "public"."app_logs" to "service_role";

grant delete on table "public"."background_jobs" to "anon";

grant insert on table "public"."background_jobs" to "anon";

grant references on table "public"."background_jobs" to "anon";

grant select on table "public"."background_jobs" to "anon";

grant trigger on table "public"."background_jobs" to "anon";

grant truncate on table "public"."background_jobs" to "anon";

grant update on table "public"."background_jobs" to "anon";

grant delete on table "public"."background_jobs" to "authenticated";

grant insert on table "public"."background_jobs" to "authenticated";

grant references on table "public"."background_jobs" to "authenticated";

grant select on table "public"."background_jobs" to "authenticated";

grant trigger on table "public"."background_jobs" to "authenticated";

grant truncate on table "public"."background_jobs" to "authenticated";

grant update on table "public"."background_jobs" to "authenticated";

grant delete on table "public"."background_jobs" to "service_role";

grant insert on table "public"."background_jobs" to "service_role";

grant references on table "public"."background_jobs" to "service_role";

grant select on table "public"."background_jobs" to "service_role";

grant trigger on table "public"."background_jobs" to "service_role";

grant truncate on table "public"."background_jobs" to "service_role";

grant update on table "public"."background_jobs" to "service_role";

grant delete on table "public"."cognitive_memories" to "anon";

grant insert on table "public"."cognitive_memories" to "anon";

grant references on table "public"."cognitive_memories" to "anon";

grant select on table "public"."cognitive_memories" to "anon";

grant trigger on table "public"."cognitive_memories" to "anon";

grant truncate on table "public"."cognitive_memories" to "anon";

grant update on table "public"."cognitive_memories" to "anon";

grant delete on table "public"."cognitive_memories" to "authenticated";

grant insert on table "public"."cognitive_memories" to "authenticated";

grant references on table "public"."cognitive_memories" to "authenticated";

grant select on table "public"."cognitive_memories" to "authenticated";

grant trigger on table "public"."cognitive_memories" to "authenticated";

grant truncate on table "public"."cognitive_memories" to "authenticated";

grant update on table "public"."cognitive_memories" to "authenticated";

grant delete on table "public"."cognitive_memories" to "service_role";

grant insert on table "public"."cognitive_memories" to "service_role";

grant references on table "public"."cognitive_memories" to "service_role";

grant select on table "public"."cognitive_memories" to "service_role";

grant trigger on table "public"."cognitive_memories" to "service_role";

grant truncate on table "public"."cognitive_memories" to "service_role";

grant update on table "public"."cognitive_memories" to "service_role";

grant delete on table "public"."events" to "anon";

grant insert on table "public"."events" to "anon";

grant references on table "public"."events" to "anon";

grant select on table "public"."events" to "anon";

grant trigger on table "public"."events" to "anon";

grant truncate on table "public"."events" to "anon";

grant update on table "public"."events" to "anon";

grant delete on table "public"."events" to "authenticated";

grant insert on table "public"."events" to "authenticated";

grant references on table "public"."events" to "authenticated";

grant select on table "public"."events" to "authenticated";

grant trigger on table "public"."events" to "authenticated";

grant truncate on table "public"."events" to "authenticated";

grant update on table "public"."events" to "authenticated";

grant delete on table "public"."events" to "service_role";

grant insert on table "public"."events" to "service_role";

grant references on table "public"."events" to "service_role";

grant select on table "public"."events" to "service_role";

grant trigger on table "public"."events" to "service_role";

grant truncate on table "public"."events" to "service_role";

grant update on table "public"."events" to "service_role";

grant delete on table "public"."feature_usage_counters" to "anon";

grant insert on table "public"."feature_usage_counters" to "anon";

grant references on table "public"."feature_usage_counters" to "anon";

grant select on table "public"."feature_usage_counters" to "anon";

grant trigger on table "public"."feature_usage_counters" to "anon";

grant truncate on table "public"."feature_usage_counters" to "anon";

grant update on table "public"."feature_usage_counters" to "anon";

grant delete on table "public"."feature_usage_counters" to "authenticated";

grant insert on table "public"."feature_usage_counters" to "authenticated";

grant references on table "public"."feature_usage_counters" to "authenticated";

grant select on table "public"."feature_usage_counters" to "authenticated";

grant trigger on table "public"."feature_usage_counters" to "authenticated";

grant truncate on table "public"."feature_usage_counters" to "authenticated";

grant update on table "public"."feature_usage_counters" to "authenticated";

grant delete on table "public"."feature_usage_counters" to "service_role";

grant insert on table "public"."feature_usage_counters" to "service_role";

grant references on table "public"."feature_usage_counters" to "service_role";

grant select on table "public"."feature_usage_counters" to "service_role";

grant trigger on table "public"."feature_usage_counters" to "service_role";

grant truncate on table "public"."feature_usage_counters" to "service_role";

grant update on table "public"."feature_usage_counters" to "service_role";

grant delete on table "public"."journey_logs" to "anon";

grant insert on table "public"."journey_logs" to "anon";

grant references on table "public"."journey_logs" to "anon";

grant select on table "public"."journey_logs" to "anon";

grant trigger on table "public"."journey_logs" to "anon";

grant truncate on table "public"."journey_logs" to "anon";

grant update on table "public"."journey_logs" to "anon";

grant delete on table "public"."journey_logs" to "authenticated";

grant insert on table "public"."journey_logs" to "authenticated";

grant references on table "public"."journey_logs" to "authenticated";

grant select on table "public"."journey_logs" to "authenticated";

grant trigger on table "public"."journey_logs" to "authenticated";

grant truncate on table "public"."journey_logs" to "authenticated";

grant update on table "public"."journey_logs" to "authenticated";

grant delete on table "public"."journey_logs" to "service_role";

grant insert on table "public"."journey_logs" to "service_role";

grant references on table "public"."journey_logs" to "service_role";

grant select on table "public"."journey_logs" to "service_role";

grant trigger on table "public"."journey_logs" to "service_role";

grant truncate on table "public"."journey_logs" to "service_role";

grant update on table "public"."journey_logs" to "service_role";

grant delete on table "public"."payment_history" to "anon";

grant insert on table "public"."payment_history" to "anon";

grant references on table "public"."payment_history" to "anon";

grant select on table "public"."payment_history" to "anon";

grant trigger on table "public"."payment_history" to "anon";

grant truncate on table "public"."payment_history" to "anon";

grant update on table "public"."payment_history" to "anon";

grant delete on table "public"."payment_history" to "authenticated";

grant insert on table "public"."payment_history" to "authenticated";

grant references on table "public"."payment_history" to "authenticated";

grant select on table "public"."payment_history" to "authenticated";

grant trigger on table "public"."payment_history" to "authenticated";

grant truncate on table "public"."payment_history" to "authenticated";

grant update on table "public"."payment_history" to "authenticated";

grant delete on table "public"."payment_history" to "service_role";

grant insert on table "public"."payment_history" to "service_role";

grant references on table "public"."payment_history" to "service_role";

grant select on table "public"."payment_history" to "service_role";

grant trigger on table "public"."payment_history" to "service_role";

grant truncate on table "public"."payment_history" to "service_role";

grant update on table "public"."payment_history" to "service_role";

grant delete on table "public"."pending_text_sessions" to "anon";

grant insert on table "public"."pending_text_sessions" to "anon";

grant references on table "public"."pending_text_sessions" to "anon";

grant select on table "public"."pending_text_sessions" to "anon";

grant trigger on table "public"."pending_text_sessions" to "anon";

grant truncate on table "public"."pending_text_sessions" to "anon";

grant update on table "public"."pending_text_sessions" to "anon";

grant delete on table "public"."pending_text_sessions" to "authenticated";

grant insert on table "public"."pending_text_sessions" to "authenticated";

grant references on table "public"."pending_text_sessions" to "authenticated";

grant select on table "public"."pending_text_sessions" to "authenticated";

grant trigger on table "public"."pending_text_sessions" to "authenticated";

grant truncate on table "public"."pending_text_sessions" to "authenticated";

grant update on table "public"."pending_text_sessions" to "authenticated";

grant delete on table "public"."pending_text_sessions" to "service_role";

grant insert on table "public"."pending_text_sessions" to "service_role";

grant references on table "public"."pending_text_sessions" to "service_role";

grant select on table "public"."pending_text_sessions" to "service_role";

grant trigger on table "public"."pending_text_sessions" to "service_role";

grant truncate on table "public"."pending_text_sessions" to "service_role";

grant update on table "public"."pending_text_sessions" to "service_role";

grant delete on table "public"."plan_feature_limits" to "anon";

grant insert on table "public"."plan_feature_limits" to "anon";

grant references on table "public"."plan_feature_limits" to "anon";

grant select on table "public"."plan_feature_limits" to "anon";

grant trigger on table "public"."plan_feature_limits" to "anon";

grant truncate on table "public"."plan_feature_limits" to "anon";

grant update on table "public"."plan_feature_limits" to "anon";

grant delete on table "public"."plan_feature_limits" to "authenticated";

grant insert on table "public"."plan_feature_limits" to "authenticated";

grant references on table "public"."plan_feature_limits" to "authenticated";

grant select on table "public"."plan_feature_limits" to "authenticated";

grant trigger on table "public"."plan_feature_limits" to "authenticated";

grant truncate on table "public"."plan_feature_limits" to "authenticated";

grant update on table "public"."plan_feature_limits" to "authenticated";

grant delete on table "public"."plan_feature_limits" to "service_role";

grant insert on table "public"."plan_feature_limits" to "service_role";

grant references on table "public"."plan_feature_limits" to "service_role";

grant select on table "public"."plan_feature_limits" to "service_role";

grant trigger on table "public"."plan_feature_limits" to "service_role";

grant truncate on table "public"."plan_feature_limits" to "service_role";

grant update on table "public"."plan_feature_limits" to "service_role";

grant delete on table "public"."predicted_outcomes" to "anon";

grant insert on table "public"."predicted_outcomes" to "anon";

grant references on table "public"."predicted_outcomes" to "anon";

grant select on table "public"."predicted_outcomes" to "anon";

grant trigger on table "public"."predicted_outcomes" to "anon";

grant truncate on table "public"."predicted_outcomes" to "anon";

grant update on table "public"."predicted_outcomes" to "anon";

grant delete on table "public"."predicted_outcomes" to "authenticated";

grant insert on table "public"."predicted_outcomes" to "authenticated";

grant references on table "public"."predicted_outcomes" to "authenticated";

grant select on table "public"."predicted_outcomes" to "authenticated";

grant trigger on table "public"."predicted_outcomes" to "authenticated";

grant truncate on table "public"."predicted_outcomes" to "authenticated";

grant update on table "public"."predicted_outcomes" to "authenticated";

grant delete on table "public"."predicted_outcomes" to "service_role";

grant insert on table "public"."predicted_outcomes" to "service_role";

grant references on table "public"."predicted_outcomes" to "service_role";

grant select on table "public"."predicted_outcomes" to "service_role";

grant trigger on table "public"."predicted_outcomes" to "service_role";

grant truncate on table "public"."predicted_outcomes" to "service_role";

grant update on table "public"."predicted_outcomes" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."prompt_versions" to "anon";

grant insert on table "public"."prompt_versions" to "anon";

grant references on table "public"."prompt_versions" to "anon";

grant select on table "public"."prompt_versions" to "anon";

grant trigger on table "public"."prompt_versions" to "anon";

grant truncate on table "public"."prompt_versions" to "anon";

grant update on table "public"."prompt_versions" to "anon";

grant delete on table "public"."prompt_versions" to "authenticated";

grant insert on table "public"."prompt_versions" to "authenticated";

grant references on table "public"."prompt_versions" to "authenticated";

grant select on table "public"."prompt_versions" to "authenticated";

grant trigger on table "public"."prompt_versions" to "authenticated";

grant truncate on table "public"."prompt_versions" to "authenticated";

grant update on table "public"."prompt_versions" to "authenticated";

grant delete on table "public"."prompt_versions" to "service_role";

grant insert on table "public"."prompt_versions" to "service_role";

grant references on table "public"."prompt_versions" to "service_role";

grant select on table "public"."prompt_versions" to "service_role";

grant trigger on table "public"."prompt_versions" to "service_role";

grant truncate on table "public"."prompt_versions" to "service_role";

grant update on table "public"."prompt_versions" to "service_role";

grant delete on table "public"."prompts" to "anon";

grant insert on table "public"."prompts" to "anon";

grant references on table "public"."prompts" to "anon";

grant select on table "public"."prompts" to "anon";

grant trigger on table "public"."prompts" to "anon";

grant truncate on table "public"."prompts" to "anon";

grant update on table "public"."prompts" to "anon";

grant delete on table "public"."prompts" to "authenticated";

grant insert on table "public"."prompts" to "authenticated";

grant references on table "public"."prompts" to "authenticated";

grant select on table "public"."prompts" to "authenticated";

grant trigger on table "public"."prompts" to "authenticated";

grant truncate on table "public"."prompts" to "authenticated";

grant update on table "public"."prompts" to "authenticated";

grant delete on table "public"."prompts" to "service_role";

grant insert on table "public"."prompts" to "service_role";

grant references on table "public"."prompts" to "service_role";

grant select on table "public"."prompts" to "service_role";

grant trigger on table "public"."prompts" to "service_role";

grant truncate on table "public"."prompts" to "service_role";

grant update on table "public"."prompts" to "service_role";

grant delete on table "public"."rag_invocation_logs" to "anon";

grant insert on table "public"."rag_invocation_logs" to "anon";

grant references on table "public"."rag_invocation_logs" to "anon";

grant select on table "public"."rag_invocation_logs" to "anon";

grant trigger on table "public"."rag_invocation_logs" to "anon";

grant truncate on table "public"."rag_invocation_logs" to "anon";

grant update on table "public"."rag_invocation_logs" to "anon";

grant delete on table "public"."rag_invocation_logs" to "authenticated";

grant insert on table "public"."rag_invocation_logs" to "authenticated";

grant references on table "public"."rag_invocation_logs" to "authenticated";

grant select on table "public"."rag_invocation_logs" to "authenticated";

grant trigger on table "public"."rag_invocation_logs" to "authenticated";

grant truncate on table "public"."rag_invocation_logs" to "authenticated";

grant update on table "public"."rag_invocation_logs" to "authenticated";

grant delete on table "public"."rag_invocation_logs" to "service_role";

grant insert on table "public"."rag_invocation_logs" to "service_role";

grant references on table "public"."rag_invocation_logs" to "service_role";

grant select on table "public"."rag_invocation_logs" to "service_role";

grant trigger on table "public"."rag_invocation_logs" to "service_role";

grant truncate on table "public"."rag_invocation_logs" to "service_role";

grant update on table "public"."rag_invocation_logs" to "service_role";

grant delete on table "public"."simulations" to "anon";

grant insert on table "public"."simulations" to "anon";

grant references on table "public"."simulations" to "anon";

grant select on table "public"."simulations" to "anon";

grant trigger on table "public"."simulations" to "anon";

grant truncate on table "public"."simulations" to "anon";

grant update on table "public"."simulations" to "anon";

grant delete on table "public"."simulations" to "authenticated";

grant insert on table "public"."simulations" to "authenticated";

grant references on table "public"."simulations" to "authenticated";

grant select on table "public"."simulations" to "authenticated";

grant trigger on table "public"."simulations" to "authenticated";

grant truncate on table "public"."simulations" to "authenticated";

grant update on table "public"."simulations" to "authenticated";

grant delete on table "public"."simulations" to "service_role";

grant insert on table "public"."simulations" to "service_role";

grant references on table "public"."simulations" to "service_role";

grant select on table "public"."simulations" to "service_role";

grant trigger on table "public"."simulations" to "service_role";

grant truncate on table "public"."simulations" to "service_role";

grant update on table "public"."simulations" to "service_role";

grant delete on table "public"."subscription_plans" to "anon";

grant insert on table "public"."subscription_plans" to "anon";

grant references on table "public"."subscription_plans" to "anon";

grant select on table "public"."subscription_plans" to "anon";

grant trigger on table "public"."subscription_plans" to "anon";

grant truncate on table "public"."subscription_plans" to "anon";

grant update on table "public"."subscription_plans" to "anon";

grant delete on table "public"."subscription_plans" to "authenticated";

grant insert on table "public"."subscription_plans" to "authenticated";

grant references on table "public"."subscription_plans" to "authenticated";

grant select on table "public"."subscription_plans" to "authenticated";

grant trigger on table "public"."subscription_plans" to "authenticated";

grant truncate on table "public"."subscription_plans" to "authenticated";

grant update on table "public"."subscription_plans" to "authenticated";

grant delete on table "public"."subscription_plans" to "service_role";

grant insert on table "public"."subscription_plans" to "service_role";

grant references on table "public"."subscription_plans" to "service_role";

grant select on table "public"."subscription_plans" to "service_role";

grant trigger on table "public"."subscription_plans" to "service_role";

grant truncate on table "public"."subscription_plans" to "service_role";

grant update on table "public"."subscription_plans" to "service_role";

grant delete on table "public"."system_logs" to "anon";

grant insert on table "public"."system_logs" to "anon";

grant references on table "public"."system_logs" to "anon";

grant select on table "public"."system_logs" to "anon";

grant trigger on table "public"."system_logs" to "anon";

grant truncate on table "public"."system_logs" to "anon";

grant update on table "public"."system_logs" to "anon";

grant delete on table "public"."system_logs" to "authenticated";

grant insert on table "public"."system_logs" to "authenticated";

grant references on table "public"."system_logs" to "authenticated";

grant select on table "public"."system_logs" to "authenticated";

grant trigger on table "public"."system_logs" to "authenticated";

grant truncate on table "public"."system_logs" to "authenticated";

grant update on table "public"."system_logs" to "authenticated";

grant delete on table "public"."system_logs" to "service_role";

grant insert on table "public"."system_logs" to "service_role";

grant references on table "public"."system_logs" to "service_role";

grant select on table "public"."system_logs" to "service_role";

grant trigger on table "public"."system_logs" to "service_role";

grant truncate on table "public"."system_logs" to "service_role";

grant update on table "public"."system_logs" to "service_role";

grant delete on table "public"."system_performance_metrics" to "anon";

grant insert on table "public"."system_performance_metrics" to "anon";

grant references on table "public"."system_performance_metrics" to "anon";

grant select on table "public"."system_performance_metrics" to "anon";

grant trigger on table "public"."system_performance_metrics" to "anon";

grant truncate on table "public"."system_performance_metrics" to "anon";

grant update on table "public"."system_performance_metrics" to "anon";

grant delete on table "public"."system_performance_metrics" to "authenticated";

grant insert on table "public"."system_performance_metrics" to "authenticated";

grant references on table "public"."system_performance_metrics" to "authenticated";

grant select on table "public"."system_performance_metrics" to "authenticated";

grant trigger on table "public"."system_performance_metrics" to "authenticated";

grant truncate on table "public"."system_performance_metrics" to "authenticated";

grant update on table "public"."system_performance_metrics" to "authenticated";

grant delete on table "public"."system_performance_metrics" to "service_role";

grant insert on table "public"."system_performance_metrics" to "service_role";

grant references on table "public"."system_performance_metrics" to "service_role";

grant select on table "public"."system_performance_metrics" to "service_role";

grant trigger on table "public"."system_performance_metrics" to "service_role";

grant truncate on table "public"."system_performance_metrics" to "service_role";

grant update on table "public"."system_performance_metrics" to "service_role";

grant delete on table "public"."user_reports" to "anon";

grant insert on table "public"."user_reports" to "anon";

grant references on table "public"."user_reports" to "anon";

grant select on table "public"."user_reports" to "anon";

grant trigger on table "public"."user_reports" to "anon";

grant truncate on table "public"."user_reports" to "anon";

grant update on table "public"."user_reports" to "anon";

grant delete on table "public"."user_reports" to "authenticated";

grant insert on table "public"."user_reports" to "authenticated";

grant references on table "public"."user_reports" to "authenticated";

grant select on table "public"."user_reports" to "authenticated";

grant trigger on table "public"."user_reports" to "authenticated";

grant truncate on table "public"."user_reports" to "authenticated";

grant update on table "public"."user_reports" to "authenticated";

grant delete on table "public"."user_reports" to "service_role";

grant insert on table "public"."user_reports" to "service_role";

grant references on table "public"."user_reports" to "service_role";

grant select on table "public"."user_reports" to "service_role";

grant trigger on table "public"."user_reports" to "service_role";

grant truncate on table "public"."user_reports" to "service_role";

grant update on table "public"."user_reports" to "service_role";

grant delete on table "public"."user_subscriptions" to "anon";

grant insert on table "public"."user_subscriptions" to "anon";

grant references on table "public"."user_subscriptions" to "anon";

grant select on table "public"."user_subscriptions" to "anon";

grant trigger on table "public"."user_subscriptions" to "anon";

grant truncate on table "public"."user_subscriptions" to "anon";

grant update on table "public"."user_subscriptions" to "anon";

grant delete on table "public"."user_subscriptions" to "authenticated";

grant insert on table "public"."user_subscriptions" to "authenticated";

grant references on table "public"."user_subscriptions" to "authenticated";

grant select on table "public"."user_subscriptions" to "authenticated";

grant trigger on table "public"."user_subscriptions" to "authenticated";

grant truncate on table "public"."user_subscriptions" to "authenticated";

grant update on table "public"."user_subscriptions" to "authenticated";

grant delete on table "public"."user_subscriptions" to "service_role";

grant insert on table "public"."user_subscriptions" to "service_role";

grant references on table "public"."user_subscriptions" to "service_role";

grant select on table "public"."user_subscriptions" to "service_role";

grant trigger on table "public"."user_subscriptions" to "service_role";

grant truncate on table "public"."user_subscriptions" to "service_role";

grant update on table "public"."user_subscriptions" to "service_role";

grant delete on table "public"."user_traits" to "anon";

grant insert on table "public"."user_traits" to "anon";

grant references on table "public"."user_traits" to "anon";

grant select on table "public"."user_traits" to "anon";

grant trigger on table "public"."user_traits" to "anon";

grant truncate on table "public"."user_traits" to "anon";

grant update on table "public"."user_traits" to "anon";

grant delete on table "public"."user_traits" to "authenticated";

grant insert on table "public"."user_traits" to "authenticated";

grant references on table "public"."user_traits" to "authenticated";

grant select on table "public"."user_traits" to "authenticated";

grant trigger on table "public"."user_traits" to "authenticated";

grant truncate on table "public"."user_traits" to "authenticated";

grant update on table "public"."user_traits" to "authenticated";

grant delete on table "public"."user_traits" to "service_role";

grant insert on table "public"."user_traits" to "service_role";

grant references on table "public"."user_traits" to "service_role";

grant select on table "public"."user_traits" to "service_role";

grant trigger on table "public"."user_traits" to "service_role";

grant truncate on table "public"."user_traits" to "service_role";

grant update on table "public"."user_traits" to "service_role";

grant delete on table "public"."user_vaults" to "anon";

grant insert on table "public"."user_vaults" to "anon";

grant references on table "public"."user_vaults" to "anon";

grant select on table "public"."user_vaults" to "anon";

grant trigger on table "public"."user_vaults" to "anon";

grant truncate on table "public"."user_vaults" to "anon";

grant update on table "public"."user_vaults" to "anon";

grant delete on table "public"."user_vaults" to "authenticated";

grant insert on table "public"."user_vaults" to "authenticated";

grant references on table "public"."user_vaults" to "authenticated";

grant select on table "public"."user_vaults" to "authenticated";

grant trigger on table "public"."user_vaults" to "authenticated";

grant truncate on table "public"."user_vaults" to "authenticated";

grant update on table "public"."user_vaults" to "authenticated";

grant delete on table "public"."user_vaults" to "service_role";

grant insert on table "public"."user_vaults" to "service_role";

grant references on table "public"."user_vaults" to "service_role";

grant select on table "public"."user_vaults" to "service_role";

grant trigger on table "public"."user_vaults" to "service_role";

grant truncate on table "public"."user_vaults" to "service_role";

grant update on table "public"."user_vaults" to "service_role";

create policy "Service role can insert AI decisions"
on "public"."ai_decision_log"
as permissive
for insert
to public
with check ((( SELECT auth.role() AS role) = 'service_role'::text));


create policy "Service role can update AI decisions"
on "public"."ai_decision_log"
as permissive
for update
to public
using ((( SELECT auth.role() AS role) = 'service_role'::text));


create policy "Users can view own AI decisions"
on "public"."ai_decision_log"
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can view their own AI interactions"
on "public"."ai_interactions"
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can view their own AI logs"
on "public"."ai_logs"
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can access their own AI simulations"
on "public"."ai_simulations"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can manage their own reports"
on "public"."analysis_reports"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can see their own app logs"
on "public"."app_logs"
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can access their own cognitive memories"
on "public"."cognitive_memories"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can manage their own events"
on "public"."events"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));


create policy "owner_can_read"
on "public"."feature_usage_counters"
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can manage their own journey logs"
on "public"."journey_logs"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can view own payment history"
on "public"."payment_history"
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can manage their own pending sessions"
on "public"."pending_text_sessions"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));


create policy "Allow authenticated users to read plan limits"
on "public"."plan_feature_limits"
as permissive
for select
to authenticated
using (true);


create policy "Allow full access for service role"
on "public"."predicted_outcomes"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Allow users to update their own predictions"
on "public"."predicted_outcomes"
as permissive
for update
to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));


create policy "Allow users to view their own predictions"
on "public"."predicted_outcomes"
as permissive
for select
to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can insert their own profile"
on "public"."profiles"
as permissive
for insert
to public
with check ((( SELECT auth.uid() AS uid) = id));


create policy "Users can update their own profile."
on "public"."profiles"
as permissive
for update
to public
using ((( SELECT auth.uid() AS uid) = id));


create policy "Users can view their own profile."
on "public"."profiles"
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = id));


create policy "Public prompt versions are viewable by authenticated users"
on "public"."prompt_versions"
as permissive
for select
to public
using ((( SELECT auth.role() AS role) = 'authenticated'::text));


create policy "Public prompts are viewable by authenticated users"
on "public"."prompts"
as permissive
for select
to public
using ((( SELECT auth.role() AS role) = 'authenticated'::text));


create policy "Users can view their own RAG logs"
on "public"."rag_invocation_logs"
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Service role can insert simulations"
on "public"."simulations"
as permissive
for insert
to public
with check ((( SELECT auth.role() AS role) = 'service_role'::text));


create policy "Users can update their own simulation feedback"
on "public"."simulations"
as permissive
for update
to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can view own simulations"
on "public"."simulations"
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Allow authenticated users to read plans"
on "public"."subscription_plans"
as permissive
for select
to authenticated
using (true);


create policy "Allow access for service_role only"
on "public"."system_logs"
as permissive
for all
to public
using ((( SELECT auth.role() AS role) = 'service_role'::text))
with check ((( SELECT auth.role() AS role) = 'service_role'::text));


create policy "Service role full access to performance metrics"
on "public"."system_performance_metrics"
as permissive
for all
to public
using ((( SELECT auth.role() AS role) = 'service_role'::text));


create policy "Users can manage their own reports"
on "public"."user_reports"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));


create policy "Allow users to manage their own subscription"
on "public"."user_subscriptions"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can manage their own traits"
on "public"."user_traits"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can manage their own vault"
on "public"."user_vaults"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));

-- KULLANICININ KENDİ TETİKLEYİCİLERİ (Bunlara DROP GEREKMEZ)
CREATE TRIGGER update_payment_history_updated_at BEFORE UPDATE ON public.payment_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER on_vault_update_log_traits AFTER UPDATE ON public.user_vaults FOR EACH ROW WHEN ((old.vault_data IS DISTINCT FROM new.vault_data)) EXECUTE FUNCTION log_traits_to_timeseries();


-- AUTH TETİKLEYİCİLERİ (Varsayılan)
DROP TRIGGER IF EXISTS assign_free_plan_trigger ON auth.users;
CREATE TRIGGER assign_free_plan_trigger AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION assign_free_plan_to_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- STORAGE TETİKLEYİCİLERİ (Varsayılan - Hatanın olduğu yer burasıydı)
DROP TRIGGER IF EXISTS enforce_bucket_name_length_trigger ON storage.buckets;
CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();

DROP TRIGGER IF EXISTS objects_delete_delete_prefix ON storage.objects;
CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

DROP TRIGGER IF EXISTS objects_insert_create_prefix ON storage.objects;
CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

DROP TRIGGER IF EXISTS objects_update_create_prefix ON storage.objects;
CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

DROP TRIGGER IF EXISTS update_objects_updated_at ON storage.objects;
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();

DROP TRIGGER IF EXISTS prefixes_create_hierarchy ON storage.prefixes;
CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

DROP TRIGGER IF EXISTS prefixes_delete_hierarchy ON storage.prefixes;
CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();