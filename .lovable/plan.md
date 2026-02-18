
## Ajout d'un champ "Prompt IA" pour générer des propositions de description

### Objectif

Avant le champ "Description" dans `CreateTaskDialog` et `EditTaskDialog`, ajouter :
1. Un champ texte **"Consignes / Prompt"** où l'utilisateur décrit ses attentes
2. Un bouton **"Générer 2 propositions"** qui appelle l'IA
3. Deux cartes de proposition côte à côte (GPT-5-mini vs Gemini Flash) que l'utilisateur peut sélectionner d'un clic pour l'injecter dans le champ description

---

### Architecture

```text
[Champ Prompt (textarea)]
[Bouton "✨ Générer 2 propositions"]
        ↓
  Edge Function: generate-task-description
        ↓ appels parallèles
  ┌──────────────────┐  ┌──────────────────┐
  │  openai/gpt-5-mini│  │gemini-2.5-flash  │
  └──────────────────┘  └──────────────────┘
        ↓
[Carte A] [Carte B]
  "Proposition GPT"   "Proposition Gemini"
  [Utiliser cette description]
```

---

### Modifications techniques

#### 1. Nouvelle Edge Function `supabase/functions/generate-task-description/index.ts`

- Reçoit `{ title, prompt }` depuis le frontend
- Effectue **2 appels parallèles** à `https://ai.gateway.lovable.dev/v1/chat/completions` :
  - Modèle A : `openai/gpt-5-mini`
  - Modèle B : `google/gemini-2.5-flash`
- System prompt : *"Tu es un assistant qui rédige des descriptions de tâches professionnelles. Rédige une description concise et claire en français, en suivant les consignes de l'utilisateur."*
- User prompt : `"Titre de la tâche : {title}\n\nConsignes : {prompt}\n\nRédige une description."`
- Retourne `{ proposalA: string, proposalB: string }`
- Ajouter `verify_jwt = false` dans `supabase/config.toml`

#### 2. `src/components/planning/CreateTaskDialog.tsx`

Ajouter **avant** le `FormField` de description :

- Un `useState` pour `aiPrompt` (string), `aiProposals` (`{ a: string, b: string } | null`), `generatingAi` (boolean)
- Un `<Textarea>` pour saisir le prompt IA (hors formulaire react-hook-form, simple state)
- Un bouton **"✨ Générer 2 propositions"** :
  - Désactivé si `aiPrompt` vide ou si titre vide
  - Appelle `supabase.functions.invoke('generate-task-description', { body: { title, prompt: aiPrompt } })`
  - Met à jour `aiProposals`
- Si `aiProposals` est défini, affiche 2 cartes côte à côte :
  ```
  ┌─────────────────────┐  ┌─────────────────────┐
  │ 💬 GPT              │  │ ✦ Gemini            │
  │ "Texte proposé..."  │  │ "Texte proposé..."  │
  │ [Utiliser]          │  │ [Utiliser]          │
  └─────────────────────┘  └─────────────────────┘
  ```
  - Clic "Utiliser" : `form.setValue('description', proposalText)` + ferme les cartes

#### 3. `src/components/planning/EditTaskDialog.tsx`

Même logique que pour `CreateTaskDialog` — ajouter le champ prompt IA et les 2 cartes de proposition avant le champ description.

---

### Fichiers à créer/modifier

| Fichier | Action |
|---|---|
| `supabase/functions/generate-task-description/index.ts` | Nouvelle edge function |
| `supabase/config.toml` | Ajouter `[functions.generate-task-description]` |
| `src/components/planning/CreateTaskDialog.tsx` | Ajout champ prompt + cartes IA |
| `src/components/planning/EditTaskDialog.tsx` | Ajout champ prompt + cartes IA |

---

### UX

- Le champ "Consignes" est facultatif — si l'utilisateur n'interagit pas avec lui, le formulaire fonctionne exactement comme avant
- Les deux propositions sont affichées côte à côte avec le nom du modèle en en-tête
- Un clic sur "Utiliser cette description" remplace le contenu du RichTextEditor et masque les cartes
- Si une génération échoue (rate limit, erreur réseau), un toast d'erreur est affiché
