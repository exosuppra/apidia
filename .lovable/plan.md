
## Ajout de bulles de prévisualisation des fiches Apidae dans le chat

### Objectif

Après chaque réponse du chatbot listant des événements ou activités, afficher des cartes de prévisualisation cliquables présentant les informations clés de chaque fiche Apidae (nom, type, commune, horaires, description courte).

### Approche

L'edge function `make-chat` retournera, en plus du texte de réponse, une liste structurée des fiches trouvées. Le frontend affichera ces données sous forme de cartes compactes sous la bulle de réponse de l'assistant.

---

### Modifications techniques

#### 1. Edge Function `supabase/functions/make-chat/index.ts`

**Objectif** : Retourner les données brutes des fiches trouvées en plus du texte de réponse.

- Stocker les résultats de `query_fiches_apidae` dans une variable partagée au niveau de la requête (`fichesPreviews`).
- À chaque appel de `query_fiches_apidae`, accumuler les fiches retournées dans `fichesPreviews`.
- Dans la réponse finale, retourner :
  ```json
  {
    "response": "texte de l'assistant...",
    "fiches_previews": [
      {
        "fiche_id": "12345",
        "nom": "Club des lecteurs",
        "type": "FETE_ET_MANIFESTATION",
        "commune": "Gréoux-les-Bains",
        "description": "Moment de partage autour des lectures...",
        "date_debut": "2026-03-13",
        "heure_debut": "17:00",
        "date_fin": "2026-03-13"
      },
      ...
    ]
  }
  ```
- Les champs extraits du JSON Apidae (`data`) : `nom.libelleFr`, `localisation.adresse.commune.nom`, `presentation.descriptifCourt.libelleFr`, plus les horaires depuis `ouverture.periodesOuvertures[0]`.

#### 2. `src/components/FloatingChat.tsx`

**Objectif** : Lire `fiches_previews` dans la réponse et les associer au message assistant.

- Modifier l'interface `Message` pour ajouter un champ optionnel :
  ```typescript
  interface FichePreview {
    fiche_id: string;
    nom: string;
    type: string;
    commune: string;
    description?: string;
    date_debut?: string;
    heure_debut?: string;
    date_fin?: string;
  }

  interface Message {
    // ...existing fields
    fichesPreview?: FichePreview[];
  }
  ```
- Après réception de la réponse de l'edge function, extraire `data.fiches_previews` et les attacher au message assistant.
- Lors de l'affichage des messages, si un message assistant a `fichesPreview`, afficher les cartes en dessous du texte.

#### 3. Nouveau composant `src/components/chat/FichePreviewCard.tsx`

**Objectif** : Afficher une carte de prévisualisation compacte pour chaque fiche.

Structure visuelle d'une carte :
```
┌─────────────────────────────────────┐
│ 🎭 Club des lecteurs                │
│ Gréoux-les-Bains • Manifestation    │
│ Vendredi 13 mars à 17h00            │
│ "Coups de cœur de la rentrée..."    │
└─────────────────────────────────────┘
```

- Icône selon le type (🎭 FETE_ET_MANIFESTATION, 🏃 ACTIVITE, 🏛️ PATRIMOINE, etc.)
- Nom en gras
- Commune + type simplifié
- Horaire si disponible
- Description courte tronquée (2 lignes max)
- Carte cliquable (prévu pour un futur lien vers la fiche complète)

Les cartes sont affichées dans un scroll horizontal sous la bulle de réponse du chatbot.

---

### Fichiers à créer/modifier

| Fichier | Action |
|---|---|
| `supabase/functions/make-chat/index.ts` | Accumuler les fiches et les retourner dans la réponse |
| `src/components/chat/FichePreviewCard.tsx` | Nouveau composant carte |
| `src/components/FloatingChat.tsx` | Lire les fiches et afficher les cartes |

### Détail de l'accumulation dans l'edge function

Dans `executeTool`, le cas `query_fiches_apidae` enrichit déjà les données. Il suffit de retourner les fiches dans un format simplifié et de les collecter dans un tableau `fichesPreviews` au niveau du handler de la requête (passé par référence dans le contexte d'exécution).

Les fiches ne sont accumulées que pour les types pertinents (FETE_ET_MANIFESTATION, ACTIVITE, PATRIMOINE_CULTUREL) pour ne pas polluer la prévisualisation avec des hébergements ou restaurants.
