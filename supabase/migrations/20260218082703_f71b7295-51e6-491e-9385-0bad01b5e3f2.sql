
-- Crée une fonction SQL pour rechercher dans les fiches_data avec des filtres JSONB
CREATE OR REPLACE FUNCTION search_fiches_apidae(
  p_search_term TEXT DEFAULT NULL,
  p_fiche_type TEXT DEFAULT NULL,
  p_commune TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_is_published BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  fiche_id TEXT,
  fiche_type TEXT,
  source TEXT,
  is_published BOOLEAN,
  nom TEXT,
  commune TEXT,
  code_postal TEXT,
  description_courte TEXT,
  description_detaillee TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  LIMIT LEAST(p_limit, 50);
END;
$$;

-- Grant access to service role
GRANT EXECUTE ON FUNCTION search_fiches_apidae TO service_role;
