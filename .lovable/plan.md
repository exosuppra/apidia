
J’ai vérifié le flux actuel et le problème semble bien identifié :

- `telegram-poll` ne retransforme pas vos messages admin en faux messages entrants. En base, les messages envoyés depuis l’admin sont stockés en `direction = "outgoing"` avec `update_id = null`, alors que les vrais messages reçus ont un `raw_update` Telegram et `from.is_bot = false`.
- Le point faible est `telegram-send` : après l’envoi à Telegram, il appelle Make avec un JSON simplifié (`chat_id`, `text`, `direction`, etc.), pas avec une structure de mise à jour Telegram.
- Comme Make “reçoit quelque chose mais l’interprète mal”, votre scénario attend très probablement un payload de type Telegram natif (`message.text`, `message.chat.id`, `message.from`, etc.).
- Et visuellement, si vous testez avec votre propre compte Telegram, voir le message “comme reçu” dans la conversation est normal : c’est le bot qui vous écrit. Le vrai bug est surtout côté transmission/interprétation vers Make.

Plan de correction

1. Corriger le payload envoyé à Make
- Modifier `supabase/functions/telegram-send/index.ts` pour envoyer à Make un objet au format “Telegram-like”.
- Inclure au minimum : `update_id`, `message.message_id`, `message.date`, `message.chat.id`, `message.chat.type`, `message.from.is_bot = true`, `message.text`.
- Ajouter en plus une clé séparée de compatibilité, par exemple `lovable_meta`, avec `direction: "outgoing"`, `source: "admin_panel"`, `synthetic: true`.

2. Rendre l’appel Make contrôlé
- Vérifier `response.ok` sur le webhook Make.
- Logger le code retour et la réponse de Make si elle échoue.
- Retourner au frontend un statut clair du type : `telegram_sent`, `make_notified`, `make_status`.

3. Corriger le retour visuel côté admin
- Mettre à jour `src/pages/admin/TelegramOTO.tsx` et `src/components/FloatingOtoChat.tsx`.
- Si Telegram envoie bien le message mais que Make refuse/mal traite le webhook, afficher un avertissement au lieu d’un succès silencieux.

4. Clarifier la sémantique locale des messages
- Uniformiser les métadonnées des messages sortants pour qu’il soit clair, côté admin et côté automatisation, qu’il s’agit d’un message envoyé par l’admin via le bot, pas d’un message entrant utilisateur.

5. Vérification de bout en bout
- Envoyer un message test depuis l’admin.
- Vérifier qu’il apparaît dans Telegram comme message du bot.
- Vérifier que Make reçoit un payload compatible avec son scénario.
- Vérifier qu’aucune nouvelle ligne `incoming` parasite n’est créée par `telegram-poll`.

Détails techniques
- Fichiers concernés :
  - `supabase/functions/telegram-send/index.ts`
  - `src/pages/admin/TelegramOTO.tsx`
  - `src/components/FloatingOtoChat.tsx`
- Aucune migration base n’est nécessaire pour ce correctif initial.
- Si besoin, je peux aussi rendre le payload Make quasi identique à une vraie update Telegram pour éviter toute modification de votre scénario côté Make.
