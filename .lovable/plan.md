

## Correction du widget Apidia

### Problème 1 — Fiches vides (priorité haute)
L'edge function `get-widget-data` applique le filtre `fiche_type` **en plus** de la sélection manuelle d'IDs. Les 6 fiches sont `COMMERCE_ET_SERVICE` mais le filtre dit `STRUCTURE` → 0 résultats.

**Correction dans `supabase/functions/get-widget-data/index.ts`** :
- Quand `selected_fiche_ids` est renseigné, ignorer les filtres `fiche_type`, `source` et `commune` (la sélection manuelle prime sur les critères)
- Alternativement, retirer le filtre `fiche_type` du widget en base

**Approche retenue** : modifier l'edge function pour que la sélection manuelle d'IDs court-circuite les autres filtres. C'est plus robuste et évite le même problème à l'avenir.

### Problème 2 — Route 404 sur le site publié
La route `/widget/:token` existe dans `App.tsx` mais le site publié n'a peut-être pas été mis à jour. Il faudra republier le frontend.

### Correction du filtre en base (bonus)
Mettre à jour le widget existant pour retirer le filtre `fiche_type: STRUCTURE` qui est incorrect :
```sql
UPDATE apidia_widgets 
SET filters = '{}'::jsonb 
WHERE share_token = '882aa5362ac3284c2b72aadd40f8da78';
```

### Fichiers modifiés
- `supabase/functions/get-widget-data/index.ts` — logique de filtrage
- Migration SQL pour corriger les filtres du widget existant

