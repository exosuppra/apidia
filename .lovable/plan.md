

## Plan : Rubrique "Linking" dans Gestion de Projet Web

### Objectif
Ajouter une rubrique de suivi du linking par commune dans la section "Gestion de Projet Web" du dashboard admin. L'outil permet d'importer les données depuis le fichier Excel, de scrapper les URLs via Firecrawl pour vérifier que les informations sont à jour, et d'envoyer un webhook Make avec un mail pré-écrit quand des modifications sont nécessaires.

### Fonctionnalités

1. **Liste des communes et URLs** -- tableau affichant toutes les communes avec leurs sites associés (type de contenu, URL, date dernier contrôle, statut, modifications à apporter, contact)
2. **Import Excel** -- bouton pour parser le fichier E-réputation.xlsx et insérer les données en base
3. **Ajout/modification manuelle** -- formulaire pour ajouter une commune, un site, ou modifier les données existantes
4. **Vérification Firecrawl** -- bouton "Vérifier" sur chaque URL (ou en masse) qui scrappe la page et utilise l'IA pour détecter si les informations sont obsolètes ou erronées
5. **Webhook Make** -- quand une anomalie est détectée, bouton pour envoyer un webhook Make avec les données du site et un mail pré-écrit demandant la mise à jour

### Modifications techniques

#### Base de données (2 tables)

**`linking_communes`** : id, nom (text), created_at
**`linking_sites`** : id, commune_id (FK), type_contenu (text), url (text), date_mise_a_jour (text), date_dernier_controle (date), statut (text: ok/a_modifier/en_attente), modifications (text), date_contact (date), reponse (text), contact_email (text), contact_notes (text), last_scrape_result (jsonb), last_scraped_at (timestamptz), created_at, updated_at

RLS : admin-only (pattern existant avec `has_role`).

#### Edge Function : `check-linking-site`
- Reçoit une URL
- Appelle Firecrawl (scrape en markdown) via le connecteur déjà configuré
- Envoie le contenu scrappé + les données actuelles de la commune à l'IA (Lovable AI / Gemini) pour analyser si les informations sont à jour
- Retourne un résultat structuré : { is_up_to_date: boolean, issues: string[], suggested_email: string }

#### Secret : `MAKE_LINKING_WEBHOOK_URL`
- Nouveau webhook Make pour envoyer les mails de demande de mise à jour

#### Nouveau fichier : `src/pages/admin/Linking.tsx`
- Page complète avec :
  - Sélecteur de commune (filtre)
  - Tableau des sites avec colonnes : Commune, Type, URL, Dernier contrôle, Statut (badge coloré), Modifications, Contact
  - Actions par ligne : Vérifier (Firecrawl), Envoyer mail (webhook Make), Modifier
  - Bouton d'import Excel
  - Bouton "Vérifier tout" pour lancer la vérification en masse
  - Dialog de détail avec le résultat du scraping et le mail pré-écrit suggéré

#### Dashboard + Routing
- Ajouter une carte "Linking" dans la section "projet-web" du dashboard (permission `linking`)
- Ajouter la route `/admin/linking` dans App.tsx avec `RequirePermission pageKey="linking"`

#### Import Excel
- Edge function ou logique côté client qui parse le fichier Excel uploadé
- Mapping des colonnes vers les tables `linking_communes` et `linking_sites`
- Gestion des doublons (upsert par commune + URL)

### Flux utilisateur

```text
1. Admin ouvre "Linking" depuis le dashboard
2. Voit la liste des sites par commune (importés ou ajoutés manuellement)
3. Clique "Vérifier" sur un site → Firecrawl scrappe → IA analyse → résultat affiché
4. Si des erreurs sont détectées → badge "À modifier" + mail pré-écrit suggéré
5. Admin clique "Envoyer le mail" → webhook Make déclenché avec les infos
6. Admin met à jour le statut manuellement après réponse
```

