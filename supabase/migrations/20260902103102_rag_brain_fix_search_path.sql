-- RAG BEYNİ: `<=>` operatörü çözümleme düzeltmesi
--
-- pgvector `extensions` şemasında kurulu; `SET search_path TO 'public'` tek başına
-- fonksiyon çalışma zamanında `<=>` operatörünü bulamıyordu → match_memories
-- sessizce boş dönüyordu (RAG hafıza getirimi fiilen kapalıydı). search_path'e
-- 'extensions' eklenir. Aynı gizli hata match_documents'te de vardı.
--
-- Not: 20260902102758/102812 dosyaları artık search_path'i düzeltilmiş halde
-- tutuyor; bu dosya prod migration geçmişiyle birebir eşleşsin diye korunur ve
-- taze bir veritabanında da güvenli (idempotent CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.match_memories(
  query_embedding extensions.vector,
  match_threshold double precision,
  match_count integer,
  p_user_id uuid,
  start_date timestamp with time zone,
  query_sentiment_embedding extensions.vector DEFAULT NULL,
  sentiment_weight double precision DEFAULT 0.25
)
 RETURNS TABLE(id uuid, content text, event_time timestamp with time zone, similarity double precision)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  half_life_days CONSTANT double precision := 45.0;
  recency_influence CONSTANT double precision := 0.30;
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.content,
    cm.event_time,
    (1 - (cm.content_embedding <=> query_embedding)) AS similarity
  FROM
    cognitive_memories AS cm
  WHERE
    cm.user_id = p_user_id
    AND cm.event_time >= start_date
    AND (1 - (cm.content_embedding <=> query_embedding)) > match_threshold
  ORDER BY
    (
      (
        (1 - (cm.content_embedding <=> query_embedding)) * (1 - sentiment_weight)
        + COALESCE(
            CASE
              WHEN query_sentiment_embedding IS NOT NULL
                   AND cm.sentiment_embedding IS NOT NULL
              THEN (1 - (cm.sentiment_embedding <=> query_sentiment_embedding))
              ELSE NULL
            END,
            (1 - (cm.content_embedding <=> query_embedding))
          ) * sentiment_weight
      )
      * (
          (1 - recency_influence)
          + recency_influence
            * power(
                0.5,
                GREATEST(0, EXTRACT(EPOCH FROM (now() - cm.event_time)) / 86400.0) / half_life_days
              )
        )
    ) DESC
  LIMIT
    match_count;
END;
$function$
;

GRANT EXECUTE ON FUNCTION public.match_memories(
  extensions.vector, double precision, integer, uuid, timestamp with time zone,
  extensions.vector, double precision
) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding extensions.vector,
  match_count integer,
  filter jsonb
)
 RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
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
    mem.user_id = (filter->>'user_id')::uuid
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$function$
;
