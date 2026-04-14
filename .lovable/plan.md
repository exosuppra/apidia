

## Problème identifié

Make utilise un module **Telegram Bot** qui parse les updates selon le schéma exact de l'API Telegram. Notre payload synthétique échoue car :
1. `update_id: null` — Make attend un **entier**, pas null
2. Les sous-objets (`chat`, `from`) peuvent manquer des champs obligatoires que Make vérifie

## Correction

Modifier `supabase/functions/telegram-send/index.ts` pour envoyer un payload **strictement identique** à une vraie update Telegram :

```typescript
const syntheticUpdate = {
  update_id: messageId || Math.floor(Date.now() / 1000),  // entier, jamais null
  message: {
    message_id: messageId,
    date: messageDate,
    chat: {
      id: chat_id,
      first_name: "User",
      type: "private",
    },
    from: {
      id: chat_id,        // utiliser le vrai chat_id
      is_bot: false,       // Make filtre peut-être is_bot=true
      first_name: "OTO Admin",
      username: "oto_admin",
    },
    text: text,
  },
};
```

### Changements clés
- **`update_id`** : entier basé sur `message_id` ou timestamp, jamais `null`
- **`from.is_bot`** : `false` — le module Telegram de Make ignore probablement les messages de bots
- **`from.id`** : le vrai `chat_id` au lieu de `0`
- **`chat.first_name`** : ajouté car Make peut l'attendre
- **Suppression de `lovable_meta`** au niveau racine — ne pas polluer le schéma Telegram attendu par Make (on peut le garder dans un champ séparé si besoin)

### Fichier modifié
- `supabase/functions/telegram-send/index.ts` — section webhook Make uniquement

