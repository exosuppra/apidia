
-- Amélioration de la fonction search_fiches_apidae avec filtrage par date
CREATE OR REPLACE FUNCTION public.search_fiches_apidae(
  p_search_term text DEFAULT NULL::text, 
  p_fiche_type text DEFAULT NULL::text, 
  p_commune text DEFAULT NULL::text, 
  p_source text DEFAULT NULL::text, 
  p_is_published boolean DEFAULT NULL::boolean, 
  p_limit integer DEFAULT 20,
  p_date_active date DEFAULT NULL::date
)
RETURNS TABLE(fiche_id text, fiche_type text, source text, is_published boolean, nom text, commune text, code_postal text, description_courte text, description_detaillee text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    fd.fiche_id,
    fd.fiche_type,
    fd.source,
    fd.is_published,
    COALESCE(fd.data->'nom'->>'libelleFr', fd.data->'nom'->>'libelleEn', 'Sans nom') AS nom,
    COALESCE(fd.data->'localisation'->'adresse'->'commune'->>'nom', '') AS commune,
    COALESCE(fd.data->'localisation'->'adresse'->>'codePostal', '') AS code_postal,
    COALESCE(fd.data->'presentation'->'descriptifCourt'->>'libelleFr', '') AS description_courte,
    COALESCE(SUBSTRING(fd.data->'presentation'->'descriptifDetaille'->>'libelleFr', 1, 400), '') AS description_detaillee
  FROM fiches_data fd
  WHERE
    (p_fiche_type IS NULL OR fd.fiche_type = p_fiche_type)
    AND (p_source IS NULL OR fd.source = p_source)
    AND (p_is_published IS NULL OR fd.is_published = p_is_published)
    AND (
      p_search_term IS NULL
      OR fd.data->'nom'->>'libelleFr' ILIKE '%' || p_search_term || '%'
      OR fd.data->'nom'->>'libelleEn' ILIKE '%' || p_search_term || '%'
    )
    AND (
      p_commune IS NULL
      OR fd.data->'localisation'->'adresse'->'commune'->>'nom' ILIKE '%' || p_commune || '%'
    )
    -- Filtrage par date active : vérifie que la date demandée tombe dans au moins une période d'ouverture
    AND (
      p_date_active IS NULL
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(fd.data->'ouverture'->'periodesOuvertures') AS periode
        WHERE
          (periode->>'dateDebut')::date <= p_date_active
          AND (periode->>'dateFin')::date >= p_date_active
      )
    )
  LIMIT LEAST(p_limit, 100);
END;
$function$
