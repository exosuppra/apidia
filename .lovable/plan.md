

## Super Thème Licorne 🦄 pour le dashboard New Gen

### Le contexte

L'interface New Gen (`AdminLayoutRefonte`) est complètement isolée du système de thèmes global :
- Elle utilise ses propres variables CSS scopées sur `.refonte-root` (couleurs PdM : gris, vert, jaune, turquoise)
- Elle **force** automatiquement `theme-tourisme` sur `<html>`, ce qui annule le thème Licorne actuel quand on est dans le new gen
- Résultat : le bouton thème actuel n'a aucun effet visuel sur cette interface

Il faut donc créer un thème Licorne **spécifique au new gen**, qui surcharge les tokens `.refonte-root`.

### Ce que je vais construire

**1. Activation du thème via le sélecteur existant**
- Le `ThemeSelector` (déjà dans le profil utilisateur) continue de piloter le choix
- Quand `theme === "unicorn"`, l'interface new gen passe en mode Licorne
- Modification du forçage de `theme-tourisme` dans `AdminLayoutRefonte` pour respecter le choix utilisateur

**2. Palette Licorne pour le new gen** (override des tokens `.refonte-root.theme-unicorn`)
- **Sidebar** : dégradé violet → rose magenta (au lieu du gris foncé)
- **Background principal** : lavande très clair avec ciel étoilé subtil
- **Accent vert PdM** → **violet/magenta** (`#B566FF`)
- **Accent jaune PdM** → **rose pailleté** (`#FF7AC6`) 
- **Accent turquoise** → **cyan glacé** (`#7AD9FF`)
- **Cards** : fond blanc nacré, bordure dégradée arc-en-ciel au hover
- **Boutons primaires** : dégradé violet→rose avec halo lumineux

**3. Effets magiques signature**
- **Titres arc-en-ciel animé** : les `<h1>`, `<h2>` et `.refonte-hero-title` reçoivent un text-gradient animé (rose→violet→cyan→jaune→rose) qui défile lentement
- **Étoiles scintillantes en fond** : pattern de petites étoiles colorées en background sur le hub
- **Halo logo** : la zone du logo APIDIA reçoit un glow violet/rose pulsé doux
- **Cards "magic" au hover** : bordure dégradée arc-en-ciel + box-shadow rose/violet
- **Indicateur de nav actif** : la barre latérale jaune devient un dégradé rose→violet pulsé
- **Bouton "Réorganiser"** et boutons primaires : box-shadow lumineux multicouche
- **Faisceau "rays"** existants : recolorisés en dégradé arc-en-ciel
- **Status dot synchro** : pulsation arc-en-ciel au lieu du vert
- Respecte `prefers-reduced-motion` (animations désactivées via `data-motion="off"`)

**4. Touches finales**
- Police titres : conserve `Archivo Black` mais avec text-shadow rose subtil
- Scrollbar : thumb dégradé violet→rose
- Avatars : bordure dégradée arc-en-ciel
- Topbar : fine ligne dégradée arc-en-ciel en bas (au lieu du gris bord)

### Détails techniques

**Fichiers modifiés :**
- `src/pages/refonte/refonte-tokens.css` — ajouter une grosse section `.refonte-root.theme-unicorn { … }` avec :
  - Override de toutes les variables `--pdm-*`, `--vert-*`, `--jaune-*`, `--turq-*`, `--bg`, `--surface`, `--gris-900` (pour la sidebar)
  - Nouveaux keyframes : `unicorn-rainbow-text`, `unicorn-sparkle-bg`, `unicorn-halo-pulse`
  - Sélecteurs spécifiques pour `.refonte-sidebar`, `.refonte-hero-title`, `.refonte-section-head h2`, `.refonte-hub-grid > *:hover`, etc.
  - Background étoilé via `radial-gradient` multiples (technique déjà utilisée dans `index.css` pour le thème Licorne classique)

- `src/layouts/AdminLayoutRefonte.tsx` :
  - Lire le thème depuis `useTheme()` 
  - Remplacer le forçage `theme-tourisme` par : applique `theme-tourisme` par défaut, mais si user a choisi `unicorn`/`ocean`/etc., applique celui-là
  - Ajouter `className={`refonte-root ${theme === 'unicorn' ? 'theme-unicorn' : ''}`}` pour scoper l'override

**Ce qui est conservé :**
- Architecture, composants, layouts, navigation, permissions — aucun changement fonctionnel
- L'interface classique garde son thème Licorne existant (déjà fonctionnel via `index.css`)
- Densité, motion settings, accent switcher restent opérationnels

**Compatibilité** : le thème reste lisible (contrastes vérifiés WCAG AA sur textes principaux), les badges de statut restent reconnaissables, tout reste utilisable en usage quotidien. C'est festif mais pas illisible.

