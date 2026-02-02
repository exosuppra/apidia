

# Plan : Fonctionnalité "Demander la validation" pour les tâches

## Résumé

Cette fonctionnalité permettra de :
1. Demander une validation externe via un webhook Make.com depuis la création/modification d'une tâche
2. Recevoir la réponse de Make.com (validé/non validé + commentaire optionnel)
3. Afficher le statut de validation sur les cartes de tâches

---

## 1. Mise à jour de la base de données

Ajouter de nouvelles colonnes à la table `tasks` pour suivre l'état de validation :

```text
+----------------------------------+------------+------------------+
| Colonne                          | Type       | Description      |
+----------------------------------+------------+------------------+
| validation_status                | text       | pending/validated|
|                                  |            | /rejected/null   |
| validation_comment               | text       | Retour de Make   |
| validation_requested_at          | timestamptz| Date de demande  |
| validation_responded_at          | timestamptz| Date de réponse  |
+----------------------------------+------------+------------------+
```

---

## 2. Nouveau secret pour le webhook

Ajouter un secret `MAKE_TASK_VALIDATION_WEBHOOK_URL` pour stocker l'URL du webhook Make dédié aux demandes de validation.

---

## 3. Edge Function : Envoyer la demande de validation

Créer `request-task-validation` qui :
- Récupère les détails de la tâche (titre, description, date d'échéance)
- Envoie ces informations au webhook Make.com
- Met à jour le statut de validation à "pending"

**Données envoyées à Make :**
```json
{
  "taskId": "uuid-de-la-tache",
  "title": "Titre de la tâche",
  "description": "Description de la tâche",
  "dueDate": "2025-02-15T10:00:00Z"
}
```

---

## 4. Edge Function : Recevoir la réponse de validation

Créer `handle-task-validation` que Make.com appellera pour envoyer la réponse :

**Données attendues de Make :**
```json
{
  "taskId": "uuid-de-la-tache",
  "validated": true,
  "comment": "Commentaire optionnel"
}
```

Cette fonction :
- Valide que la tâche existe et est en attente de validation
- Met à jour `validation_status` ("validated" ou "rejected")
- Enregistre le `validation_comment` si fourni
- Met à jour `validation_responded_at`

---

## 5. Modifications de l'interface utilisateur

### 5.1 Bouton "Demander la validation"

Ajouter un bouton dans les dialogues de création et modification de tâche :
- **CreateTaskDialog.tsx** : Nouveau bouton à côté de "Créer"
- **EditTaskDialog.tsx** : Nouveau bouton à côté de "Mettre à jour"

Le bouton sera :
- Désactivé si une validation est déjà en cours
- Affiche un indicateur de chargement pendant l'envoi

### 5.2 Affichage du statut de validation

Dans **TaskCard.tsx**, ajouter un badge indiquant le statut :
- 🟡 "En attente" (orange) - validation demandée
- ✅ "Validé" (vert) - validation acceptée  
- ❌ "Rejeté" (rouge) - validation refusée

Si un commentaire existe, il sera affiché dans une info-bulle.

### 5.3 Mise à jour des types TypeScript

Modifier `src/types/planning.ts` pour ajouter les nouveaux champs :
```typescript
export interface Task {
  // ... champs existants
  validation_status?: "pending" | "validated" | "rejected" | null;
  validation_comment?: string | null;
  validation_requested_at?: string | null;
  validation_responded_at?: string | null;
}
```

---

## 6. Configuration du webhook Make

Ajouter les nouvelles fonctions dans `supabase/config.toml` :
- `request-task-validation` - avec JWT désactivé (appelée depuis le frontend authentifié)
- `handle-task-validation` - avec JWT désactivé (appelée par Make.com)

---

## Fichiers à modifier/créer

| Fichier | Action |
|---------|--------|
| `src/types/planning.ts` | Modifier - ajouter les champs de validation |
| `src/components/planning/CreateTaskDialog.tsx` | Modifier - ajouter bouton validation |
| `src/components/planning/EditTaskDialog.tsx` | Modifier - ajouter bouton validation |
| `src/components/planning/TaskCard.tsx` | Modifier - afficher le statut |
| `supabase/functions/request-task-validation/index.ts` | Créer |
| `supabase/functions/handle-task-validation/index.ts` | Créer |
| `supabase/config.toml` | Modifier - ajouter les fonctions |
| Migration SQL | Créer - ajouter les colonnes |

---

## Workflow complet

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Utilisateur    │     │  Edge Function   │     │   Make.com  │
│  (Interface)    │     │  (Backend)       │     │   (Webhook) │
└────────┬────────┘     └────────┬─────────┘     └──────┬──────┘
         │                       │                      │
         │ 1. Clic "Demander     │                      │
         │    la validation"     │                      │
         ├──────────────────────>│                      │
         │                       │                      │
         │                       │ 2. Envoi webhook     │
         │                       │    (titre, desc,     │
         │                       │    date échéance)    │
         │                       ├─────────────────────>│
         │                       │                      │
         │                       │ 3. Mise à jour       │
         │                       │    status: pending   │
         │<──────────────────────┤                      │
         │                       │                      │
         │                       │         ...          │
         │                       │                      │
         │                       │ 4. Réponse Make      │
         │                       │<─────────────────────┤
         │                       │                      │
         │                       │ 5. Mise à jour       │
         │ 6. Affichage statut   │    status + comment  │
         │<──────────────────────┤                      │
         │                       │                      │
```

