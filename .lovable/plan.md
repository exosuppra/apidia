

## Plan : Créer un événement Outlook via Make.com pour les tâches "Article Web"

### Principe
Quand une tâche avec le tag "Article Web" est créée dans le planning éditorial, un webhook Make.com est appelé avec les détails de la tâche. Le scénario Make se charge de créer l'événement dans l'agenda Outlook.

### Modifications

#### 1. Ajouter un nouveau secret
- `MAKE_OUTLOOK_EVENT_WEBHOOK_URL` : URL du webhook Make.com qui crée l'événement Outlook.

#### 2. Créer une Edge Function `create-outlook-event`
- Reçoit : `title`, `description`, `due_date`, `tags` (pour vérifier "Article Web" côté serveur aussi)
- Envoie un POST au webhook Make avec ces données
- Make.com se charge de créer l'événement Outlook (module Microsoft 365 Outlook > Create an Event)

#### 3. Modifier `CreateTaskDialog.tsx`
- Après la création réussie d'une tâche avec le tag "Article Web", appeler l'edge function `create-outlook-event` avec les infos de la tâche (titre, description, date)
- Afficher un toast de confirmation ou d'erreur

#### 4. Données envoyées au webhook
```json
{
  "title": "Titre de la tâche",
  "description": "Description de la tâche",
  "due_date": "2026-03-20T10:00:00",
  "planning_name": "Nom du planning",
  "task_id": "uuid"
}
```

### Côté Make.com (à configurer par l'utilisateur)
1. Créer un scénario avec un trigger "Webhooks > Custom webhook"
2. Ajouter un module "Microsoft 365 Outlook > Create an Event"
3. Mapper les champs reçus (titre, description, date) vers l'événement Outlook
4. Copier l'URL du webhook dans le secret Lovable

### Détails techniques
- La détection du tag "Article Web" se fait en croisant les `selectedTags` avec la liste des tags pour trouver le nom, comme pour la logique de validation Laura/Marie existante.
- L'appel est fait après la création de la tâche (pas bloquant) pour ne pas ralentir le flow de création.

