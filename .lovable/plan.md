

## Planning Foire aux Santons

### Contexte

Le fichier Excel contient deux onglets :
- **Bénévoles** (~42 personnes) : civilité, nom, ville, contact, stand souhaité, personne avec qui ils veulent être, disponibilités par jour (oui/non sur 10 jours : 23/10 au 01/11)
- **Santonniers** (~17 stands) : nom du stand, contact, présence/absence, bénévole souhaité, bénévole non souhaité

### Fonctionnalité

Une page admin `/admin/planning-santons` accessible via la section "RH & Administration" du dashboard, protégée par une permission `planning-santons`.

### Architecture

**1. Tables en base de données**

- `santons_benevoles` : id, civilite, prenom, nom, ville, telephone, email, stand_souhaite, souhaite_etre_avec, created_at
- `santons_benevoles_disponibilites` : id, benevole_id, date, disponible (boolean)
- `santons_santonniers` : id, nom_stand, prenom, nom, ville, telephone, email, site_web, presence_info, created_at
- `santons_santonniers_preferences` : id, santonnier_id, benevole_souhaite (text), benevole_non_souhaite (text)
- `santons_planning` : id, date, santonnier_id, benevole_id, created_at (les affectations générées)
- `santons_editions` : id, title, year, start_date, end_date, created_at (pour gérer les éditions)

**2. Import des données**

- Bouton d'import du fichier Excel pour pré-remplir bénévoles et santonniers
- Possibilité d'ajouter/modifier manuellement ensuite

**3. Interface utilisateur (3 onglets)**

- **Onglet Bénévoles** : tableau des bénévoles avec leurs disponibilités (grille jour par jour), stand souhaité, compagnon souhaité. CRUD complet.
- **Onglet Santonniers** : tableau des santonniers avec leurs préférences/exclusions de bénévoles. CRUD complet.
- **Onglet Planning** : vue calendrier/grille (jours en colonnes, santonniers en lignes) montrant les affectations. Bouton "Générer le planning" qui appelle l'IA pour optimiser les affectations.

**4. Génération automatique du planning (Edge Function)**

Une edge function `generate-santons-planning` qui utilise un modèle IA (Gemini) pour résoudre le problème d'affectation en respectant les contraintes :
- Disponibilité du bénévole ce jour-là
- Stand souhaité par le bénévole
- Souhait d'être avec une autre personne
- Bénévole souhaité par le santonnier
- Bénévole non souhaité par le santonnier
- Présence/absence du santonnier
- Répartition équitable (chaque bénévole fait un nombre similaire de jours)

L'IA reçoit toutes les données en JSON et retourne les affectations optimales.

**5. Ajustements manuels**

Après génération, possibilité de drag-and-drop ou d'éditer manuellement les affectations dans la grille du planning, avec alertes visuelles si une contrainte est violée.

**6. Export**

Export du planning final en Excel ou PDF.

### Fichiers à créer/modifier

- Migration SQL pour les 6 tables + RLS
- `src/pages/admin/PlanningSantons.tsx` (page principale avec 3 onglets)
- `src/components/santons/BenevolesTab.tsx`
- `src/components/santons/SantonnersTab.tsx`
- `src/components/santons/PlanningTab.tsx`
- `src/components/santons/ImportExcelDialog.tsx`
- `supabase/functions/generate-santons-planning/index.ts`
- Mise à jour de `App.tsx` (route) et `Dashboard.tsx` (carte)

### Étapes d'implémentation

1. Créer les tables et RLS
2. Créer la page avec import Excel et onglets bénévoles/santonniers
3. Créer l'onglet planning avec la grille visuelle
4. Créer l'edge function de génération IA
5. Ajouter la route, la carte dashboard et la permission

