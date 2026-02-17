

# Synchronisation Apidae en une seule invocation

## Probleme actuel
La fonction `trigger-apidae-sync` ne traite qu'un seul batch (200 fiches) par appel, ce qui oblige a configurer 24 appels successifs dans Make.com pour synchroniser les ~4800 fiches.

## Solution
Modifier `trigger-apidae-sync` pour qu'elle boucle en interne et traite tous les batches en un seul appel, avec une limite de temps de securite (50 secondes) pour eviter le timeout de 60 secondes des Edge Functions.

- Si la synchronisation se termine en moins de 50 secondes : la reponse contient `completed: true` et Make n'a rien d'autre a faire.
- Si le temps est depasse avant la fin : la reponse contient `completed: false` avec la progression sauvegardee. Make n'aurait qu'a rappeler une 2e fois (au lieu de 24 fois).

En pratique, avec 24 batches et chaque batch prenant environ 2-3 secondes, la totalite devrait tenir dans un seul appel.

## Changements techniques

### 1. Modifier `trigger-apidae-sync`
- Ajouter une boucle `while` qui traite les batches les uns apres les autres
- Verifier le temps ecoule avant chaque batch (limite a 50s)
- Sauvegarder la progression a chaque batch (au cas ou)
- Ne sortir que quand c'est termine ou que le temps est ecoule

### 2. Modifier `cron-apidae-sync`
- Appliquer la meme logique de boucle interne pour que le cron automatique fonctionne aussi en une seule invocation

### Resultat cote Make
- Un seul module HTTP suffit dans la grande majorite des cas
- Si jamais la sync prend plus de 50 secondes, un simple "repeat if `completed` is false" suffit (2 appels max au lieu de 24)
