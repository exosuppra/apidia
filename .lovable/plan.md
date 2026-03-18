

## Plan : Validation Laura / Marie pour les tâches "Article Web"

### Principe
Quand une tâche a le tag **"Article Web"**, le bouton "Créer et demander validation" (CreateTaskDialog) et "Demander validation" (EditTaskDialog) sont remplacés par deux boutons : **"Demander Validation Laura"** et **"Demander Validation Marie"**. Chacun appelle un webhook Make.com distinct. Le retour (validé/rejeté) affiche qui a validé.

### Modifications

#### 1. Ajouter 2 nouveaux secrets
- `MAKE_VALIDATION_LAURA_WEBHOOK_URL`
- `MAKE_VALIDATION_MARIE_WEBHOOK_URL`

Vous serez invité a les renseigner via l'interface.

#### 2. Modifier la base de données
Ajouter une colonne `validation_target` (text, nullable) a la table `tasks` pour stocker "laura" ou "marie".

#### 3. Modifier l'Edge Function `request-task-validation`
- Accepter un nouveau parametre `target` ("laura" | "marie" | null).
- Si `target` est "laura", utiliser le secret `MAKE_VALIDATION_LAURA_WEBHOOK_URL`.
- Si `target` est "marie", utiliser `MAKE_VALIDATION_MARIE_WEBHOOK_URL`.
- Sinon, utiliser le webhook generique existant `MAKE_TASK_VALIDATION_WEBHOOK_URL`.
- Sauvegarder `validation_target` dans la tache.

#### 4. Modifier `CreateTaskDialog.tsx`
- Detecter si le tag "Article Web" est selectionne parmi les `selectedTags` (comparer le nom du tag).
- Si oui : remplacer le bouton "Créer et demander validation" par deux boutons :
  - "Demander Validation Laura" (appelle `onSubmit` avec `target: "laura"`)
  - "Demander Validation Marie" (appelle `onSubmit` avec `target: "marie"`)
- Transmettre le `target` a `requestTaskValidation`.

#### 5. Modifier `EditTaskDialog.tsx`
- Meme logique : detecter si la tache a le tag "Article Web".
- Si oui : remplacer le bouton "Demander validation" par les deux boutons Laura/Marie.
- Transmettre le `target` a la fonction `requestValidation`.

#### 6. Afficher qui a valide
- Dans les deux dialogs, quand `validation_status` est "validated" ou "rejected", afficher "Validé par Laura" / "Rejeté par Marie" en se basant sur `validation_target`.

#### 7. Mettre a jour le type `Task`
Ajouter `validation_target?: "laura" | "marie" | null` dans `src/types/planning.ts`.

### Détails techniques
- La detection du tag "Article Web" se fait en croisant `selectedTags` (array d'IDs) avec la liste `tags`/`allTags` pour trouver le nom correspondant.
- Les deux nouveaux boutons utilisent des couleurs distinctes (ex: bleu pour Laura, violet pour Marie) pour les differencier visuellement.

