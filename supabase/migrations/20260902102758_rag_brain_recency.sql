-- RAG BEYNİ: Hafıza getiriminde "recency decay" (yakınlık ağırlığı)
--
-- Sorun: Eski match_memories yalnızca içerik (cosine) benzerliğine göre sıralıyordu;
-- start_date her zaman 1970 olduğu için 2 yıl önceki bir anı ile dünkü anı eşit
-- ağırlıktaydı. Bu, "yol arkadaşı" hissini bozuyor ve güncelliğini yitirmiş anıları
-- güncel olanlarla aynı seviyede öne çıkarıyordu.
--
-- Çözüm: Aynı imza korunarak (geriye tam uyumlu, CREATE OR REPLACE) sıralamaya
-- zamana dayalı bir ağırlık eklenir. `similarity` çıktısı HÂLÂ saf içerik benzerliği
-- olarak döner (downstream smartFilterMemories eşikleri -0.85/0.7/0.65- anlamını korur),
-- yalnızca SIRALAMA recency ile harmanlanır.
--
-- recency_weight = 0.5 ^ (yaş_gün / yarı_ömür)   -> yarı_ömür gününde 0.5'e iner
-- final_rank     = içerik_benzerliği * (1 - etki + etki * recency_weight)
--   etki (recency_influence) = 0.30  -> güncellik nazikçe iter, çok alakalı eski anıyı yok etmez
-- yarı_ömür = 45 gün (env yerine sabit; ileride parametreleştirilebilir)

CREATE OR REPLACE FUNCTION public.match_memories(
  query_embedding extensions.vector,
  match_threshold double precision,
  match_count integer,
  p_user_id uuid,
  start_date timestamp with time zone
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
    -- Downstream uyumluluğu için: saf içerik benzerliği döner
    (1 - (cm.content_embedding <=> query_embedding)) AS similarity
  FROM
    cognitive_memories AS cm
  WHERE
    cm.user_id = p_user_id
    AND cm.event_time >= start_date
    AND (1 - (cm.content_embedding <=> query_embedding)) > match_threshold
  ORDER BY
    -- Sıralama: içerik benzerliği * recency harmanı
    (
      (1 - (cm.content_embedding <=> query_embedding))
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
