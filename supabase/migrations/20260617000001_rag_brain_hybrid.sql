-- RAG BEYNİ: HİBRİT skorlama (content + sentiment + recency)
--
-- Sorun: cognitive_memories 3 embedding tutuyor (content/sentiment/stylometry) ama
-- yalnızca content_embedding sorgulanıyordu. sentiment_embedding ölü yatırımdı.
--
-- Çözüm: match_memories'e OPSİYONEL `query_sentiment_embedding` parametresi eklenir.
--   - NULL ise (varsayılan): davranış 20260617000000 (recency) ile BİREBİR aynı kalır
--     (sentiment_sim, content_sim'e düşer; ağırlık etkisizleşir). Tam geriye uyumlu.
--   - Verilirse: sıralama skoru content + sentiment benzerliğini harmanlar, recency korunur.
-- `similarity` çıktısı HÂLÂ saf content benzerliğidir (downstream smartFilterMemories
-- eşikleri 0.85/0.7/0.65 anlamını korur). Yalnızca SIRALAMA hibritleşir.
--
-- İmza değiştiği için CREATE OR REPLACE yetmez; önce DROP gerekir.

DROP FUNCTION IF EXISTS public.match_memories(
  extensions.vector, double precision, integer, uuid, timestamp with time zone
);

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
 SET search_path TO 'public'
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
    -- Downstream uyumluluğu için: saf içerik benzerliği döner
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
        -- içerik benzerliği ağırlıklı
        (1 - (cm.content_embedding <=> query_embedding)) * (1 - sentiment_weight)
        -- + duygu benzerliği (yoksa içerik benzerliğine düşer -> ağırlık etkisiz)
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
      -- recency harmanı (güncel anılar nazikçe öne çıkar)
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

-- DROP + CREATE loses the previous grants; restore them to match the old function.
GRANT EXECUTE ON FUNCTION public.match_memories(
  extensions.vector, double precision, integer, uuid, timestamp with time zone,
  extensions.vector, double precision
) TO anon, authenticated, service_role;
