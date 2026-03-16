

# Plan : Export Excel global + Export PDF individuel par bénévole

## Contexte
Le planning des affectations doit pouvoir être exporté sous deux formats :
1. **Excel** : un tableau complet du planning (stands en lignes, jours en colonnes, noms des bénévoles dans les cellules), mis en forme proprement
2. **PDF** : un planning individuel par bénévole (un PDF par personne avec ses jours, stands et horaires)

## Dépendances
- `xlsx` est déjà installé — utilisé pour l'export Excel
- `jspdf` + `jspdf-autotable` à ajouter — pour générer les PDF individuels côté client

## Modifications

### 1. Ajouter les dépendances PDF
Installer `jspdf` et `jspdf-autotable`.

### 2. Créer `src/components/santons/ExportPlanningExcel.ts`
Fonction utilitaire qui génère un fichier Excel avec :
- **Feuille "Planning"** : tableau croisé stands × jours, chaque cellule contient les 2 noms de bénévoles, en-têtes en gras avec fond coloré, colonnes auto-dimensionnées
- **Feuille "Résumé bénévoles"** : liste des bénévoles avec nombre de jours affectés
- Nom de fichier : `Planning_Santons_{année}.xlsx`

### 3. Créer `src/components/santons/ExportPlanningPDF.ts`
Fonction utilitaire qui génère un PDF par bénévole :
- Titre avec nom du bénévole et nom de l'édition
- Tableau : colonnes Jour | Stand affecté
- Uniquement les jours où le bénévole est affecté
- Téléchargement d'un ZIP contenant tous les PDF (via `jszip`) ou téléchargement séquentiel
- Alternative plus simple : un seul PDF multi-pages (une page par bénévole) pour éviter une dépendance supplémentaire

### 4. Modifier `PlanningTab.tsx`
Ajouter deux boutons d'export dans le header de la card :
- **"Export Excel"** avec icône FileSpreadsheet — appelle la fonction Excel
- **"Export PDF individuels"** avec icône FileText — appelle la fonction PDF

Les boutons ne s'affichent que s'il y a des affectations.

## Architecture des exports

```text
Excel (1 fichier)                    PDF (1 fichier multi-pages)
┌──────────────────────┐             ┌──────────────────────┐
│ Planning_Santons.xlsx│             │ Plannings_Benevoles.pdf│
│                      │             │                      │
│ Feuille "Planning"   │             │ Page 1: Dupont Jean  │
│ Stand | Lun | Mar .. │             │ Jour    | Stand      │
│ A     | X Y | Z W ..│             │ 25/11   | Stand A    │
│                      │             │ 26/11   | Stand A    │
│ Feuille "Résumé"     │             │                      │
│ Bénévole | Nb jours  │             │ Page 2: Martin Marie │
│ Dupont   | 8         │             │ ...                  │
└──────────────────────┘             └──────────────────────┘
```

## Détails techniques
- L'export Excel utilise `xlsx` (XLSX.utils) avec styles via les options de formatage disponibles
- L'export PDF utilise `jspdf` avec `jspdf-autotable` pour les tableaux propres
- Un seul PDF multi-pages évite d'avoir besoin de `jszip`
- Les deux exports sont 100% côté client, pas de backend nécessaire

