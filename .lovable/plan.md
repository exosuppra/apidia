
## Problème identifié

Le bug vient de la logique de déduction d'année dans le prompt système de l'edge function `supabase/functions/make-chat/index.ts`.

### Cause racine

La règle actuelle dans le prompt :

> "Si cette date est encore à venir dans l'année en cours, utilise l'année en cours. Si cette date est déjà passée dans l'année en cours, utilise l'année suivante."

Le modèle compare le **mois/jour** mentionné (13 mars) à la date du jour (18 février). Comme mars > février, le modèle interprète "13 mars" comme étant **après** la date du jour dans l'année en cours — mais il inverse la logique et pense que le 13 mars est "passé" par rapport au 18 février, puis conclut que la date 2026 est dans le passé.

En réalité, le 13 mars 2026 est bien **dans le futur** par rapport au 18 février 2026.

### Correction

Réécrire la règle de déduction d'année dans le prompt de façon très explicite, sans ambiguïté, en donnant un exemple concret avec la date actuelle réelle :

**Règle actuelle (ambiguë) :**
```
Si cette date est encore à venir dans l'année en cours, utilise l'année en cours.
Si cette date est déjà passée dans l'année en cours, utilise l'année suivante.
```

**Nouvelle règle (explicite) :**
```
IMPORTANT : Pour déduire l'année d'une date sans année :
1. Construis la date avec l'année en cours : ex. "13 mars" → 2026-03-13
2. Compare cette date à aujourd'hui (${nowIso})
3. Si 2026-03-13 >= 2026-02-18 (aujourd'hui) → la date est dans le futur → utilise 2026
4. Si 2026-03-13 < 2026-02-18 → la date est déjà passée → utilise 2027
5. NE JAMAIS demander confirmation à l'utilisateur — déduis-le toi-même.
```

En injectant directement les dates calculées dans le prompt (pas des règles abstraites que le modèle peut mal interpréter), on élimine l'ambiguïté.

### Fichier à modifier

- `supabase/functions/make-chat/index.ts` — Section `systemPrompt`, règle "Interprétation intelligente des dates sans année" (lignes ~624-628)

### Changement technique

Remplacer la règle abstraite par une règle concrète avec les dates réelles calculées en TypeScript au moment de l'exécution, de façon à ce que le modèle ne puisse pas se tromper dans la comparaison :

```typescript
// Calcul TypeScript (avant le prompt)
const currentYear = now.getFullYear();
const nextYear = currentYear + 1;
const nowIso = now.toISOString().split("T")[0]; // ex: "2026-02-18"

// Dans le prompt :
`Pour déduire l'année d'une date sans année :
Exemple : "13 mars" → construis d'abord ${currentYear}-03-13, compare à aujourd'hui ${nowIso}.
- Si ${currentYear}-03-13 >= ${nowIso} (futur ou aujourd'hui) → utilise ${currentYear}
- Si ${currentYear}-03-13 < ${nowIso} (déjà passé) → utilise ${nextYear}
Ne jamais demander confirmation à l'utilisateur.`
```

Cela rend la logique transparente pour le modèle avec des valeurs concrètes au lieu de règles abstraites qu'il peut mal appliquer.
