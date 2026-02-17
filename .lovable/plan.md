
# Ajout de l'outil `query_fiches_apidae` au chatbot Apidia

## Objectif
Permettre au chatbot d'interroger directement les ~5000 fiches synchronisees depuis Apidae (table `fiches_data`) avec recherche par nom, type, commune, etc.

## Structure des donnees `fiches_data`
Les fiches contiennent un champ JSONB `data` avec cette structure :
- `data->'nom'->'libelleFr'` : nom de la fiche
- `data->'localisation'->'adresse'->'commune'->'nom'` : commune
- `data->'localisation'->'adresse'->'codePostal'` : code postal
- `data->'presentation'->'descriptifCourt'->'libelleFr'` : description courte
- `data->'presentation'->'descriptifDetaille'->'libelleFr'` : description detaillee
- `data->'ouverture'` : horaires d'ouverture
- `data->'illustrations'` : photos/medias
- `data->'informations'` : informations complementaires
- `fiche_type` : type (STRUCTURE, COMMERCE_ET_SERVICE, HEBERGEMENT_LOCATIF, FETE_ET_MANIFESTATION, EQUIPEMENT, RESTAURATION, PATRIMOINE_CULTUREL, ACTIVITE, etc.)
- `source` : provenance (apidae, make_webhook)

Types principaux et volumes :
- STRUCTURE : ~2900
- COMMERCE_ET_SERVICE : ~550
- HEBERGEMENT_LOCATIF : ~670
- FETE_ET_MANIFESTATION : ~440
- EQUIPEMENT : ~300
- RESTAURATION : ~215
- PATRIMOINE_CULTUREL : ~310

## Modifications

### 1. Ajouter la definition de l'outil dans le tableau `tools`

Nouvel outil `query_fiches_apidae` avec les parametres :
- `search_term` (string) : recherche par nom (dans `data->'nom'->'libelleFr'`)
- `fiche_type` (string, enum des types principaux) : filtre par type de fiche
- `commune` (string) : recherche par commune (dans `data->'localisation'->'adresse'->'commune'->'nom'`)
- `source` (string, enum: apidae/make_webhook) : filtre par source
- `is_published` (boolean) : filtre par statut de publication
- `limit` (number) : nombre max de resultats (defaut: 20)

### 2. Ajouter le cas dans `executeTool`

La requete Supabase interrogera `fiches_data` avec :
- Recherche textuelle `ilike` sur le nom via un cast text du JSONB
- Filtre exact sur `fiche_type`
- Recherche textuelle sur la commune via cast text du JSONB localisation
- Filtre sur `source` et `is_published`
- Retourne les champs utiles extraits du JSON (nom, commune, code postal, description, type) pour eviter de renvoyer le JSON brut complet (trop volumineux)

### 3. Mettre a jour le system prompt

Ajouter une ligne dans la section "Base de donnees Apidia" du prompt systeme pour mentionner `query_fiches_apidae` et ses capacites (recherche de fiches Apidae par nom, type, commune).

## Fichier modifie
- `supabase/functions/make-chat/index.ts`

## Points techniques
- Les resultats seront formates (extraction nom, commune, code postal, description, type) pour ne pas depasser les limites de tokens du modele AI
- La limite par defaut est 20 fiches pour garder des reponses rapides sur les ~5000 fiches
