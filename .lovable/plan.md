

## Diagnostic des 3 bugs OTO Telegram

### Bug 1 — Messages Telegram entrants : Make ne reçoit rien
**Cause** : La fonction `telegram-poll` stocke les messages entrants mais **ne notifie jamais le webhook Make**. Seul `telegram-send` (envoi depuis l'interface) appelle le webhook Make.

**Correction** : Ajouter dans `telegram-poll` un appel au webhook `MAKE_OTO_WEBHOOK_URL` pour chaque message entrant (utilisateur réel, pas bot).

### Bug 2 — Messages entrants affichés comme venant d'OTO
**Cause** : Quand le bot (piloté par Make) répond sur Telegram, sa réponse arrive dans `getUpdates`. La fonction `telegram-poll` stocke **tous** les messages comme `direction: "incoming"`. Les messages du bot sont donc affichés comme des messages entrants avec le nom du bot.

**Correction** : Dans `telegram-poll`, détecter si `from.is_bot === true` → stocker avec `direction: "outgoing"` et `sender_name: "OTO Bot"`. Cela les affichera correctement à droite dans l'interface.

### Bug 3 — L'interface admin ne reçoit pas les réponses du bot
**Cause** : Conséquence du Bug 2. Les réponses du bot sont stockées comme "incoming" au lieu de "outgoing", mais elles apparaissent bien en base. Le vrai problème est que le polling n'est pas automatique — il faut cliquer manuellement sur "Récupérer les messages". Le realtime fonctionne déjà, donc une fois le poll déclenché, les réponses apparaîtront. Mais si personne ne poll pendant que le bot répond, les messages restent dans Telegram et ne sont jamais récupérés.

**Correction partielle** : Le cron job pg_cron (s'il est actif) devrait déclencher le poll automatiquement. Vérifier s'il est en place. En attendant, la correction du Bug 2 fera que les réponses du bot s'afficheront correctement une fois récupérées.

### Bug bonus — Clés dupliquées dans la console
L'erreur React "two children with same key" vient du fait que `telegram-send` insère un message sans `update_id`, puis le même message arrive via `getUpdates` avec un `update_id`. Deux lignes en base pour le même message → clé dupliquée dans le rendu.

**Correction** : Dans `telegram-send`, stocker le `message_id` Telegram retourné, puis dans `telegram-poll`, ignorer les messages sortants du bot qui ont déjà été stockés (en comparant `message_id` ou en filtrant `from.is_bot`).

---

### Fichier modifié
**`supabase/functions/telegram-poll/index.ts`** :
1. Détecter `u.message.from?.is_bot === true` → `direction: "outgoing"`, `sender_name: "OTO Bot"`, et **ne pas envoyer au webhook Make**
2. Pour les messages utilisateur réels (`is_bot === false`) → appeler `MAKE_OTO_WEBHOOK_URL` avec le payload Telegram brut
3. Filtrer les messages du bot déjà stockés par `telegram-send` pour éviter les doublons (skip si `from.is_bot && direction === outgoing` existe déjà pour ce `chat_id` + texte récent)

### Complexité
Modification d'un seul fichier + redéploiement de l'edge function.

