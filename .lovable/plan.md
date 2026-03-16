

# Fix : Bénévole assigné à 2 stands le même jour

## Diagnostic

Le bug est à la ligne 176. Quand l'algorithme assigne les bénévoles "home stand", il ne vérifie **pas** si le bénévole est déjà affecté à un autre stand ce jour-là via `newAssignments`.

Scénario concret :
1. Bénévole X est "home" du stand A
2. Le stand B est traité **avant** le stand A dans la boucle
3. Stand B manque de bénévoles, X est pris comme "fallback" pour stand B → ajouté à `newAssignments`
4. Ensuite stand A est traité, X est dans `homeVols` → la ligne 176 ne vérifie que la disponibilité, pas `newAssignments` → X est assigné une 2e fois

## Correction

Ajouter une vérification `!newAssignments.some(...)` dans la boucle home-stand (ligne 176), identique à celle déjà présente pour les candidats fallback (ligne 189).

```typescript
// Ligne 176 : ajouter le check anti-doublon
if (
  ben && 
  ben.disponibilites[day] === true && 
  assigned.length < SLOTS_PER_STAND &&
  !newAssignments.some((a) => a.jour === day && a.benevole_id === benId)
) {
```

C'est un changement d'une seule ligne dans `PlanningTab.tsx`.

