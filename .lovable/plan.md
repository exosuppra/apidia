

# Apidia Chat - UX ergonomique + affichage des fiches Apidae

## Probleme actuel
La page publique `/apidia` (ApidiaChat) est basique : pas de streaming fluide avec fiches, pas de cartes de previsualisation Apidae. Les fiches sont envoyees en contexte a l'IA mais jamais renvoyees au client pour affichage visuel.

## Architecture de la solution

Le flux sera en deux etapes :
1. L'edge function `apidia-chat` envoie d'abord un event SSE special `data: {"fiches_previews": [...]}` contenant les fiches Apidae trouvees, AVANT le stream IA
2. Le frontend parse cet event initial, stocke les fiches, puis affiche le stream texte normalement avec les cartes de fiches en dessous de la reponse

## Modifications prevues

### 1. Edge function `apidia-chat/index.ts`
- Apres la recherche Apidae, construire un tableau `fiches_previews` avec les donnees enrichies (nom, type, commune, image, telephone, etc.) en extrayant les infos du JSON Apidae complet (pas juste les champs aplatis de la RPC)
- Faire une requete supplementaire pour recuperer les donnees completes (`data` JSONB) des fiches trouvees par la RPC
- Creer un ReadableStream custom qui :
  - Emet d'abord un SSE `data: {"fiches_previews": [...]}` 
  - Puis pipe le stream de l'IA tel quel
- Ajouter dans le system prompt une instruction pour que l'IA mentionne les noms exacts des fiches dans sa reponse (pour coherence avec les cartes)

### 2. Page `ApidiaChat.tsx` - Refonte complete
- Ajouter le type `FichePreview` et importer `FichePreviewCard`
- Etendre le type `Msg` avec `fichesPreview?: FichePreview[]`
- Dans le parsing SSE : detecter l'event special `fiches_previews` et le stocker sur le message assistant
- Afficher les cartes de fiches en carrousel horizontal sous chaque reponse assistant qui en contient
- Ameliorations ergonomiques :
  - Suggestions de questions rapides au demarrage (chips cliquables)
  - Animation de typing plus fluide
  - Meilleur espacement et design des bulles
  - Scroll automatique plus naturel
  - Input avec bouton micro (reutiliser le pattern du FloatingChat)
  - Responsive : pleine hauteur sur mobile

### 3. Aucune migration DB necessaire
Les donnees viennent de `fiches_data` existant, enrichies a la volee.

## Details techniques

```text
Client                    Edge Function              AI Gateway
  |                           |                          |
  |-- POST messages --------->|                          |
  |                           |-- search_fiches_apidae ->|
  |                           |-- SELECT fiches_data --->|
  |                           |                          |
  |<-- SSE: fiches_previews --|                          |
  |                           |-- stream request ------->|
  |<-- SSE: AI tokens --------|<-- SSE: AI tokens -------|
  |                           |                          |
  [parse fiches -> cards]     |                          |
  [parse tokens -> markdown]  |                          |
```

Le premier event SSE aura le format :
```json
data: {"fiches_previews":[{"fiche_id":"123","nom":"...","type":"RESTAURATION","commune":"Manosque","image_url":"..."}]}
```

Les events suivants sont le stream IA standard OpenAI-compatible.

