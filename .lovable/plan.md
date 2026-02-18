
# Auto-chainage des batches Apidae : déclenchement unique depuis Make.com

## Problème actuel

Make.com envoie un signal → `trigger-apidae-sync` traite ~1-2 batches (50s) → retourne `completed: false` → **s'arrête et attend que Make rappelle**, ce qui ne se fait pas automatiquement.

Résultat : la sync reste bloquée après le batch 4 (ou peu importe le nombre traité dans les 50 premières secondes).

## Solution : Auto-rappel asynchrone (Self-Chaining)

Quand le budget temps est dépassé et qu'il reste des fiches à synchroniser, la fonction **se rappelle elle-même** en fire-and-forget avant de retourner la réponse à Make. Make n'a donc plus besoin de boucler.

```text
Make.com → trigger-apidae-sync (batch 1-2, 50s)
                ↓ auto-rappel async (fire-and-forget)
           trigger-apidae-sync (batch 3-4, 50s)
                ↓ auto-rappel async
           trigger-apidae-sync (batch 5-6, 50s)
                ↓ ...
           trigger-apidae-sync → completed: true ✓
```

## Modification : `supabase/functions/trigger-apidae-sync/index.ts`

Remplacer le bloc final "Time budget exceeded" par un auto-rappel :

```typescript
// Au lieu de simplement retourner completed: false...
// On se rappelle en fire-and-forget :
fetch(`${SUPABASE_URL}/functions/v1/trigger-apidae-sync`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ resume: true }),
}).catch((e) => console.error("Self-invoke error:", e));
// Pas de await → fire-and-forget

// Puis on retourne immédiatement à Make
return json({
  success: true,
  completed: false,
  message: `Batch en cours, continuation automatique lancée...`,
  batch: batchNumber,
  synced: totalSynced,
  total: totalFound,
});
```

## Garde-fous importants

- **Anti-boucle infinie** : au début de la fonction, si `current_sync_status === "running"` ET que la requête contient `resume: true`, on reprend directement sans réinitialiser. Si le statut est `interrupted`, on s'arrête immédiatement (déjà implémenté).
- **Un seul processus actif** : si `current_sync_status === "running"` et qu'un nouveau signal Make arrive (pas `resume`), on le traite normalement (reprise de là où on en était, déjà géré).
- **Fin de sync** : quand `isComplete === true`, on finalise normalement et on n'envoie pas d'auto-rappel.

## Fichier modifié

- `supabase/functions/trigger-apidae-sync/index.ts` : ajout du self-invoke fire-and-forget quand le time budget est dépassé
