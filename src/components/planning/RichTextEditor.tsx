import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bold, Italic, Smile, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

// Individual emoji keywords for precise search
const emojiKeywords: Record<string, string[]> = {
  // Visages
  "😀": ["sourire", "content", "heureux", "joie"],
  "😃": ["sourire", "content", "heureux", "grand"],
  "😄": ["sourire", "rire", "heureux", "yeux"],
  "😁": ["sourire", "dents", "heureux"],
  "😆": ["rire", "haha", "lol", "mdr"],
  "😅": ["sueur", "gêné", "ouf", "soulagement"],
  "🤣": ["mort de rire", "mdr", "lol", "ptdr", "rire"],
  "😂": ["rire", "pleurer", "larmes", "joie", "mdr"],
  "🙂": ["sourire", "léger", "poli"],
  "🙃": ["envers", "sarcastique", "ironique"],
  "😉": ["clin d'oeil", "complice"],
  "😊": ["sourire", "rougir", "timide", "content"],
  "😇": ["ange", "innocent", "sage"],
  "🥰": ["amour", "coeurs", "love", "adorable"],
  "😍": ["amour", "yeux coeurs", "love", "crush"],
  "🤩": ["star", "impressionné", "wow", "génial"],
  "😘": ["bisou", "kiss", "amour"],
  "😗": ["bisou", "kiss"],
  "😚": ["bisou", "yeux fermés"],
  "😙": ["bisou", "sourire"],
  "🥲": ["sourire", "larme", "émotion", "triste"],
  "😋": ["miam", "délicieux", "langue", "gourmand"],
  "😛": ["langue", "taquin"],
  "😜": ["clin d'oeil", "langue", "fou"],
  "🤪": ["fou", "crazy", "dingue"],
  "😝": ["langue", "yeux fermés", "beurk"],
  "🤑": ["argent", "dollar", "riche", "money"],
  "🤗": ["câlin", "hug", "accueil"],
  "🤭": ["oups", "rire caché", "gêné"],
  "🤫": ["chut", "secret", "silence"],
  "🤔": ["réfléchir", "penser", "hmm", "question"],
  "🤐": ["bouche fermée", "secret", "zip"],
  "🤨": ["sceptique", "doute", "sourcil"],
  "😐": ["neutre", "indifférent"],
  "😑": ["ennuyé", "blasé"],
  "😶": ["sans voix", "silence", "muet"],
  "😏": ["sourire en coin", "malin", "séducteur"],
  "😒": ["agacé", "pas content", "déçu"],
  "🙄": ["yeux au ciel", "exaspéré", "pfff"],
  "😬": ["grimace", "gêné", "oups"],
  "😌": ["soulagé", "zen", "paisible"],
  "😔": ["triste", "déçu", "pensive"],
  "😪": ["fatigué", "goutte", "endormi"],
  "🤤": ["bave", "miam", "envie"],
  "😴": ["dort", "zzz", "fatigué", "nuit"],
  "😷": ["malade", "masque", "covid"],
  "🤒": ["fièvre", "malade", "thermomètre"],
  "🤕": ["blessé", "mal", "bandage"],
  "🤢": ["nausée", "vert", "malade"],
  "🤮": ["vomir", "dégoût", "malade"],
  "🤧": ["éternuer", "rhume", "malade"],
  "🥵": ["chaud", "transpirer", "canicule"],
  "🥶": ["froid", "gelé", "hiver"],
  "🥴": ["ivre", "étourdi", "confus"],
  "😵": ["ko", "assommé", "vertige"],
  "🤯": ["explosé", "mind blown", "choqué", "incroyable"],
  "🤠": ["cowboy", "western", "chapeau"],
  "🥳": ["fête", "party", "anniversaire", "célébration"],
  "🥸": ["déguisé", "incognito", "lunettes"],
  "😎": ["cool", "lunettes", "soleil", "classe"],
  "🤓": ["nerd", "intello", "lunettes"],
  "🧐": ["monocle", "inspecter", "analyser"],
  "😕": ["confus", "perplexe"],
  "😟": ["inquiet", "soucieux"],
  "🙁": ["triste", "déçu"],
  "☹️": ["triste", "malheureux"],
  "😮": ["surpris", "oh", "bouche ouverte"],
  "😯": ["surpris", "choqué"],
  "😲": ["choqué", "surpris", "wow"],
  "😳": ["gêné", "rougir", "choqué"],
  "🥺": ["suppliant", "pitié", "mignon", "please"],
  "😦": ["inquiet", "choqué"],
  "😧": ["angoissé", "inquiet"],
  "😨": ["peur", "effrayé", "terrifié"],
  "😰": ["anxieux", "sueur", "stress"],
  "😥": ["triste", "déçu", "soulagé"],
  "😢": ["pleurer", "larme", "triste"],
  "😭": ["pleurer", "sangloter", "triste", "larmes"],
  "😱": ["crier", "peur", "horreur", "choc"],
  "😖": ["confus", "frustré"],
  "😣": ["persévérer", "effort"],
  "😞": ["déçu", "triste"],
  "😓": ["sueur", "stress", "effort"],
  "😩": ["fatigué", "exaspéré"],
  "😫": ["épuisé", "fatigué"],
  "🥱": ["bâiller", "fatigué", "ennui"],
  "😤": ["énervé", "furieux", "vapeur"],
  "😡": ["colère", "rage", "fâché"],
  "😠": ["fâché", "colère"],
  "🤬": ["insulte", "colère", "gros mots"],
  "😈": ["diable", "malin", "espiègle"],
  "👿": ["diable", "méchant", "colère"],
  "💀": ["mort", "crâne", "mdr", "dead"],
  "☠️": ["mort", "danger", "poison"],
  "💩": ["caca", "merde", "poop"],
  "🤡": ["clown", "blague", "drôle"],
  "👹": ["ogre", "monstre", "japon"],
  "👺": ["tengu", "monstre", "japon"],

  // Gestes
  "👋": ["salut", "coucou", "hello", "bye", "au revoir"],
  "🤚": ["stop", "main", "arrête"],
  "🖐️": ["main", "cinq", "stop"],
  "✋": ["stop", "main", "high five"],
  "🖖": ["vulcain", "spock", "star trek"],
  "👌": ["ok", "parfait", "bien"],
  "🤌": ["italien", "geste", "mamma mia"],
  "🤏": ["petit", "peu", "pincer"],
  "✌️": ["victoire", "paix", "peace", "v"],
  "🤞": ["croiser", "chance", "espoir"],
  "🤟": ["je t'aime", "rock", "love"],
  "🤘": ["rock", "metal", "musique"],
  "🤙": ["appel", "téléphone", "cool", "shaka"],
  "👈": ["gauche", "là-bas", "pointer"],
  "👉": ["droite", "toi", "pointer"],
  "👆": ["haut", "up", "pointer"],
  "🖕": ["doigt", "insulte"],
  "👇": ["bas", "down", "pointer"],
  "☝️": ["attention", "un", "idée"],
  "👍": ["ok", "bien", "pouce", "like", "top", "bravo"],
  "👎": ["nul", "pas bien", "dislike", "non"],
  "✊": ["poing", "force", "solidarité"],
  "👊": ["poing", "fist bump", "frappe"],
  "🤛": ["poing gauche", "fist bump"],
  "🤜": ["poing droit", "fist bump"],
  "👏": ["applaudir", "bravo", "félicitations", "clap"],
  "🙌": ["mains levées", "hourra", "célébration", "yay"],
  "👐": ["mains ouvertes", "jazz hands"],
  "🤲": ["paumes", "offrir", "prier"],
  "🤝": ["poignée de main", "deal", "accord", "partenariat"],
  "🙏": ["prier", "merci", "please", "namaste", "svp"],
  "✍️": ["écrire", "signer"],
  "💅": ["vernis", "manucure", "sassy"],
  "🤳": ["selfie", "photo"],
  "💪": ["muscle", "fort", "force", "gym", "sport"],

  // Cœurs
  "❤️": ["coeur", "amour", "love", "rouge"],
  "🧡": ["coeur", "orange", "amour"],
  "💛": ["coeur", "jaune", "amitié"],
  "💚": ["coeur", "vert", "nature", "jalousie"],
  "💙": ["coeur", "bleu", "confiance"],
  "💜": ["coeur", "violet", "purple"],
  "🖤": ["coeur", "noir", "dark"],
  "🤍": ["coeur", "blanc", "pur"],
  "🤎": ["coeur", "marron", "brown"],
  "💔": ["coeur brisé", "triste", "rupture"],
  "❣️": ["coeur", "exclamation", "amour"],
  "💕": ["coeurs", "amour", "love"],
  "💞": ["coeurs", "tournent", "amour"],
  "💓": ["coeur", "battement", "amour"],
  "💗": ["coeur", "grandit", "amour"],
  "💖": ["coeur", "étoiles", "amour"],
  "💘": ["coeur", "flèche", "cupidon", "amour"],
  "💝": ["coeur", "cadeau", "ruban"],
  "💟": ["coeur", "décoration"],
  "💌": ["lettre", "amour", "love letter"],
  "💋": ["bisou", "lèvres", "kiss"],
  "💯": ["cent", "parfait", "100", "top"],
  "💢": ["colère", "énervement"],
  "💥": ["explosion", "boom", "pow"],
  "💫": ["étoile", "étourdi", "magic"],
  "💦": ["sueur", "eau", "gouttes"],
  "💨": ["vent", "vite", "fuite"],
  "💬": ["parler", "bulle", "message", "chat"],
  "💭": ["penser", "bulle", "rêver"],
  "💤": ["dormir", "zzz", "nuit"],
  "✨": ["étoiles", "brillant", "magic", "paillettes", "sparkle"],
  "⭐": ["étoile", "star", "favori"],
  "🌟": ["étoile", "brillant", "briller"],

  // Fête
  "🎉": ["fête", "confetti", "party", "célébration", "bravo"],
  "🎊": ["confetti", "fête", "célébration"],
  "🎈": ["ballon", "fête", "anniversaire"],
  "🎁": ["cadeau", "présent", "gift", "anniversaire", "noël"],
  "🎀": ["ruban", "noeud", "cadeau"],
  "🎂": ["gâteau", "anniversaire", "bougie"],
  "🍰": ["gâteau", "part", "dessert"],
  "🧁": ["cupcake", "gâteau", "dessert"],
  "🎄": ["sapin", "noël", "christmas"],
  "🎃": ["citrouille", "halloween", "pumpkin"],
  "🏆": ["trophée", "victoire", "champion", "gagner"],
  "🥇": ["médaille", "or", "premier", "gold", "victoire"],
  "🥈": ["médaille", "argent", "deuxième", "silver"],
  "🥉": ["médaille", "bronze", "troisième"],
  "⚽": ["foot", "football", "ballon", "sport"],
  "🏀": ["basket", "basketball", "ballon", "sport"],
  "🏈": ["football américain", "sport"],
  "⚾": ["baseball", "sport"],
  "🎾": ["tennis", "sport", "balle"],
  "🏐": ["volley", "volleyball", "sport"],
  "🎱": ["billard", "8", "boule"],

  // Travail
  "📝": ["note", "écrire", "memo", "to-do", "tâche"],
  "📋": ["presse-papiers", "liste", "checklist", "clipboard"],
  "📌": ["punaise", "épingler", "pin", "important"],
  "📍": ["localisation", "lieu", "pin", "map"],
  "📎": ["trombone", "attache", "clip"],
  "📐": ["équerre", "angle", "géométrie"],
  "📏": ["règle", "mesure"],
  "📁": ["dossier", "fichier", "folder"],
  "📂": ["dossier ouvert", "fichier"],
  "📅": ["calendrier", "date", "planning", "rdv"],
  "📆": ["calendrier", "date", "jour"],
  "📈": ["graphique", "hausse", "croissance", "stats", "up"],
  "📉": ["graphique", "baisse", "déclin", "stats", "down"],
  "📊": ["graphique", "stats", "barres", "analytics"],
  "📧": ["email", "mail", "courriel", "message"],
  "✉️": ["enveloppe", "lettre", "mail"],
  "📦": ["colis", "paquet", "livraison", "box"],
  "✏️": ["crayon", "écrire", "modifier", "edit"],
  "🖋️": ["stylo", "plume", "écrire"],
  "🖊️": ["stylo", "écrire"],
  "📓": ["carnet", "cahier", "notes"],
  "📔": ["carnet", "cahier", "décoré"],
  "📒": ["carnet", "jaune", "notes"],
  "📕": ["livre", "rouge", "fermé"],
  "📗": ["livre", "vert"],
  "📘": ["livre", "bleu"],
  "📙": ["livre", "orange"],
  "📚": ["livres", "bibliothèque", "études", "lire"],
  "📖": ["livre ouvert", "lire", "lecture"],
  "🔗": ["lien", "link", "url", "chaîne"],
  "💼": ["mallette", "travail", "business", "bureau"],
  "📃": ["document", "page", "fichier"],
  "📄": ["document", "page", "fichier"],

  // Tech
  "💻": ["ordinateur", "laptop", "pc", "travail", "code"],
  "🖥️": ["écran", "ordinateur", "desktop", "pc"],
  "🖨️": ["imprimante", "printer", "imprimer"],
  "⌨️": ["clavier", "keyboard", "taper"],
  "🖱️": ["souris", "mouse", "cliquer"],
  "💾": ["disquette", "sauvegarder", "save", "retro"],
  "💿": ["cd", "disque", "musique"],
  "📀": ["dvd", "disque", "film"],
  "📱": ["téléphone", "mobile", "smartphone", "phone"],
  "📲": ["téléphone", "appel", "mobile"],
  "☎️": ["téléphone", "fixe", "appel", "retro"],
  "📞": ["téléphone", "combiné", "appel"],
  "🔋": ["batterie", "pile", "énergie", "charge"],
  "🔌": ["prise", "électricité", "brancher"],
  "💡": ["ampoule", "idée", "lumière", "eureka"],
  "🔦": ["lampe", "torche", "lumière"],
  "💸": ["argent", "billet", "ailes", "dépenser"],
  "💵": ["dollar", "argent", "billet", "money"],
  "💴": ["yen", "argent", "japon"],
  "💶": ["euro", "argent", "europe", "money"],
  "💷": ["livre", "argent", "uk"],
  "💰": ["sac argent", "money", "riche", "fortune"],
  "💳": ["carte", "crédit", "paiement", "cb"],
  "💎": ["diamant", "bijou", "précieux", "luxe"],
  "🔧": ["clé", "outil", "réparer", "settings"],
  "🔨": ["marteau", "outil", "construire"],
  "🛠️": ["outils", "réparer", "bricolage"],
  "⚙️": ["engrenage", "paramètres", "settings", "config"],

  // Nature
  "🌵": ["cactus", "désert", "plante"],
  "🌲": ["arbre", "sapin", "forêt", "nature"],
  "🌳": ["arbre", "nature", "forêt"],
  "🌴": ["palmier", "tropical", "vacances", "plage"],
  "🌱": ["pousse", "plante", "croissance", "nature"],
  "🌿": ["feuille", "herbe", "nature", "plante"],
  "☘️": ["trèfle", "irlande", "chance"],
  "🍀": ["trèfle", "chance", "lucky", "quatre"],
  "🍃": ["feuilles", "vent", "nature"],
  "🍂": ["feuilles", "automne", "fall"],
  "🍁": ["érable", "canada", "automne"],
  "🍄": ["champignon", "mushroom", "nature"],
  "💐": ["bouquet", "fleurs", "cadeau"],
  "🌷": ["tulipe", "fleur", "printemps"],
  "🌹": ["rose", "fleur", "amour", "romantique"],
  "🥀": ["rose fanée", "triste", "fleur"],
  "🌺": ["hibiscus", "fleur", "tropical"],
  "🌸": ["cerisier", "fleur", "japon", "sakura", "printemps"],
  "🌼": ["marguerite", "fleur", "nature"],
  "🌻": ["tournesol", "fleur", "soleil", "jaune"],
  "🌞": ["soleil", "visage", "content", "beau temps"],
  "🌝": ["lune", "pleine", "nuit"],
  "🌙": ["lune", "croissant", "nuit", "dormir"],
  "🌎": ["terre", "monde", "planète", "amérique"],
  "🌍": ["terre", "monde", "planète", "europe", "afrique"],
  "🌏": ["terre", "monde", "planète", "asie"],
  "🪐": ["planète", "saturne", "espace"],
  "⚡": ["éclair", "électricité", "rapide", "flash"],
  "🔥": ["feu", "flamme", "hot", "chaud", "tendance", "fire"],
  "🌪️": ["tornade", "vent", "tempête"],
  "🌈": ["arc-en-ciel", "rainbow", "couleurs", "gay"],
  "☀️": ["soleil", "beau", "été", "chaud"],
  "⛅": ["nuage", "soleil", "météo"],
  "☁️": ["nuage", "couvert", "météo"],
  "🌧️": ["pluie", "météo", "nuage"],
  "❄️": ["neige", "flocon", "hiver", "froid"],
  "⛄": ["bonhomme de neige", "hiver", "neige"],

  // Nourriture
  "🍕": ["pizza", "italien", "manger", "fast food"],
  "🍔": ["burger", "hamburger", "manger", "fast food"],
  "🍟": ["frites", "manger", "fast food"],
  "🌭": ["hot dog", "manger"],
  "🥪": ["sandwich", "manger", "midi"],
  "🌮": ["taco", "mexicain", "manger"],
  "🌯": ["burrito", "mexicain", "wrap"],
  "🥙": ["kebab", "pita", "manger"],
  "🍳": ["oeuf", "petit-déjeuner", "cuisiner"],
  "🥗": ["salade", "légumes", "healthy", "santé"],
  "🍿": ["popcorn", "cinéma", "film"],
  "🍝": ["pâtes", "spaghetti", "italien"],
  "🍜": ["nouilles", "ramen", "asiatique", "soupe"],
  "🍣": ["sushi", "japon", "poisson"],
  "🍱": ["bento", "japon", "repas"],
  "🍦": ["glace", "dessert", "été", "cornet"],
  "🍧": ["granité", "glace", "dessert"],
  "🍨": ["glace", "dessert", "coupe"],
  "🍩": ["donut", "dessert", "sucré"],
  "🍪": ["cookie", "biscuit", "dessert"],
  "🍫": ["chocolat", "dessert", "sucré"],
  "🍬": ["bonbon", "candy", "sucré"],
  "🍭": ["sucette", "lollipop", "bonbon"],
  "🥛": ["lait", "milk", "verre"],
  "☕": ["café", "coffee", "matin", "tasse", "chaud"],
  "🍵": ["thé", "tea", "tasse", "chaud"],
  "🧃": ["jus", "brique", "boisson"],
  "🍷": ["vin", "rouge", "alcool", "verre"],
  "🍺": ["bière", "beer", "alcool", "pinte"],
  "🍻": ["bières", "trinquer", "cheers", "santé"],
  "🥂": ["champagne", "toast", "fête", "célébration"],
  "🍾": ["champagne", "bouteille", "fête", "célébration"],

  // Voyage
  "🚀": ["fusée", "espace", "lancement", "startup", "rocket"],
  "✈️": ["avion", "voyage", "vol", "vacances"],
  "🛫": ["décollage", "avion", "partir"],
  "🛬": ["atterrissage", "avion", "arriver"],
  "💺": ["siège", "avion", "place"],
  "🚁": ["hélicoptère", "vol", "transport"],
  "🚂": ["train", "locomotive", "vapeur"],
  "🚃": ["train", "wagon", "métro"],
  "🚄": ["train", "tgv", "rapide"],
  "🚅": ["train", "shinkansen", "japon"],
  "🚆": ["train", "gare"],
  "🚇": ["métro", "underground", "subway"],
  "🚌": ["bus", "autobus", "transport"],
  "🚍": ["bus", "transport"],
  "🚐": ["van", "minibus"],
  "🚑": ["ambulance", "urgence", "hôpital"],
  "🚒": ["pompier", "camion", "feu"],
  "🚓": ["police", "voiture", "urgence"],
  "🚕": ["taxi", "voiture", "transport"],
  "🚗": ["voiture", "auto", "car", "conduire"],
  "🚘": ["voiture", "auto"],
  "🚙": ["suv", "voiture", "4x4"],
  "🚚": ["camion", "livraison", "déménagement"],
  "🏎️": ["formule 1", "course", "rapide", "racing"],
  "🏍️": ["moto", "motorcycle", "vitesse"],
  "🛵": ["scooter", "vespa", "moto"],
  "🚲": ["vélo", "bicyclette", "cyclisme", "bike"],
  "🛴": ["trottinette", "scooter"],
  "🚏": ["arrêt bus", "station"],
  "⛽": ["essence", "station", "fuel", "carburant"],
  "⚓": ["ancre", "bateau", "mer"],
  "⛵": ["voilier", "bateau", "mer", "navigation"],
  "🛶": ["canoë", "kayak", "pagaie"],
  "🚤": ["bateau", "speed boat", "mer"],
  "🛳️": ["paquebot", "croisière", "bateau"],
  "🏠": ["maison", "home", "chez soi"],
  "🏡": ["maison", "jardin", "home"],
  "🏢": ["immeuble", "bureau", "building", "travail"],
  "🏨": ["hôtel", "hotel", "vacances"],
  "🏥": ["hôpital", "santé", "médecin"],
  "🏫": ["école", "school", "études"],
  "🏛️": ["monument", "gouvernement", "antique"],
  "⛪": ["église", "religion", "prière"],
  "🕌": ["mosquée", "religion", "islam"],
  "🗼": ["tour", "tokyo", "japon"],
  "🗽": ["statue liberté", "new york", "usa"],
  "🗿": ["moai", "statue", "île de pâques"],

  // Alertes
  "✅": ["ok", "validé", "check", "fait", "done", "coché"],
  "❌": ["non", "erreur", "faux", "supprimer", "annuler"],
  "⚠️": ["attention", "warning", "danger", "alerte"],
  "🚫": ["interdit", "non", "stop"],
  "⛔": ["interdit", "stop", "entrée"],
  "🔴": ["rouge", "point", "stop", "live"],
  "🟠": ["orange", "point"],
  "🟡": ["jaune", "point"],
  "🟢": ["vert", "point", "go", "ok", "online"],
  "🔵": ["bleu", "point"],
  "🟣": ["violet", "point", "purple"],
  "⚫": ["noir", "point"],
  "⚪": ["blanc", "point"],
  "❓": ["question", "aide", "demander"],
  "❔": ["question", "aide"],
  "❕": ["exclamation", "attention"],
  "❗": ["exclamation", "attention", "important"],
  "‼️": ["double exclamation", "urgent"],
  "⁉️": ["question exclamation", "quoi"],
  "ℹ️": ["info", "information", "aide"],
  "🔔": ["notification", "cloche", "alerte", "bell"],
  "🔕": ["silencieux", "mute", "pas de son"],
  "🔒": ["verrouillé", "sécurité", "lock", "privé"],
  "🔓": ["déverrouillé", "ouvert", "unlock"],
  "🔑": ["clé", "key", "accès", "mot de passe"],
  "🔐": ["cadenas", "clé", "sécurisé"],
};

const emojiCategories = {
  "😊": {
    name: "Visages",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
      "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
      "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫",
      "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬",
      "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕",
      "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳",
      "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯",
      "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭",
      "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡",
      "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺",
    ]
  },
  "👋": {
    name: "Gestes",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
      "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍",
      "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝",
      "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂",
      "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅",
    ]
  },
  "❤️": {
    name: "Cœurs",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️",
      "💌", "💋", "💯", "💢", "💥", "💫", "💦", "💨", "🕳️", "💣",
      "💬", "👁️‍🗨️", "🗨️", "🗯️", "💭", "💤", "✨", "⭐", "🌟", "💫",
    ]
  },
  "🎉": {
    name: "Fête",
    emojis: [
      "🎉", "🎊", "🎈", "🎁", "🎀", "🎂", "🍰", "🧁", "🥳", "🎄",
      "🎃", "🎗️", "🎟️", "🎫", "🎖️", "🏆", "🥇", "🥈", "🥉", "⚽",
      "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀",
      "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁",
    ]
  },
  "📝": {
    name: "Travail",
    emojis: [
      "📝", "📋", "📌", "📍", "📎", "🖇️", "📐", "📏", "🗂️", "📁",
      "📂", "🗃️", "🗄️", "🗑️", "📅", "📆", "🗓️", "📇", "📈", "📉",
      "📊", "📑", "🔖", "🏷️", "📧", "✉️", "📩", "📨", "📤", "📥",
      "📦", "📪", "📫", "📬", "📭", "📮", "🗳️", "✏️", "✒️", "🖋️",
      "🖊️", "🖌️", "🖍️", "📓", "📔", "📒", "📕", "📗", "📘", "📙",
      "📚", "📖", "🔗", "📎", "💼", "📁", "📂", "🗂️", "📃", "📄",
    ]
  },
  "💻": {
    name: "Tech",
    emojis: [
      "💻", "🖥️", "🖨️", "⌨️", "🖱️", "🖲️", "💽", "💾", "💿", "📀",
      "📱", "📲", "☎️", "📞", "📟", "📠", "🔋", "🔌", "💡", "🔦",
      "🕯️", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "🪙", "💰",
      "💳", "💎", "⚖️", "🪜", "🧰", "🪛", "🔧", "🔨", "⚒️", "🛠️",
      "⛏️", "🪚", "🔩", "⚙️", "🪤", "🧲", "🔫", "💣", "🧨", "🪓",
    ]
  },
  "🌿": {
    name: "Nature",
    emojis: [
      "🌵", "🎄", "🌲", "🌳", "🌴", "🪵", "🌱", "🌿", "☘️", "🍀",
      "🎍", "🪴", "🎋", "🍃", "🍂", "🍁", "🍄", "🐚", "🪨", "🌾",
      "💐", "🌷", "🌹", "🥀", "🌺", "🌸", "🌼", "🌻", "🌞", "🌝",
      "🌛", "🌜", "🌚", "🌕", "🌖", "🌗", "🌘", "🌑", "🌒", "🌓",
      "🌔", "🌙", "🌎", "🌍", "🌏", "🪐", "💫", "⭐", "🌟", "✨",
      "⚡", "☄️", "💥", "🔥", "🌪️", "🌈", "☀️", "🌤️", "⛅", "🌥️",
    ]
  },
  "🍕": {
    name: "Nourriture",
    emojis: [
      "🍕", "🍔", "🍟", "🌭", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆",
      "🥚", "🍳", "🥘", "🍲", "🫕", "🥣", "🥗", "🍿", "🧈", "🧂",
      "🥫", "🍝", "🍜", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙",
      "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦",
      "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩",
      "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "🫖", "☕", "🍵", "🧃",
    ]
  },
  "🚀": {
    name: "Voyage",
    emojis: [
      "🚀", "✈️", "🛫", "🛬", "🪂", "💺", "🚁", "🚂", "🚃", "🚄",
      "🚅", "🚆", "🚇", "🚈", "🚉", "🚊", "🚝", "🚞", "🚋", "🚌",
      "🚍", "🚎", "🚐", "🚑", "🚒", "🚓", "🚔", "🚕", "🚖", "🚗",
      "🚘", "🚙", "🛻", "🚚", "🚛", "🚜", "🏎️", "🏍️", "🛵", "🦽",
      "🚲", "🛴", "🛹", "🛼", "🚏", "🛣️", "🛤️", "🛢️", "⛽", "🚨",
      "🚥", "🚦", "🛑", "🚧", "⚓", "⛵", "🛶", "🚤", "🛳️", "⛴️",
    ]
  },
  "⚠️": {
    name: "Alertes",
    emojis: [
      "✅", "❌", "⚠️", "🚫", "⛔", "📛", "🔴", "🟠", "🟡", "🟢",
      "🔵", "🟣", "🟤", "⚫", "⚪", "🔶", "🔷", "🔸", "🔹", "🔺",
      "🔻", "💠", "🔘", "🔳", "🔲", "▪️", "▫️", "◾", "◽", "◼️",
      "◻️", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "⬛", "⬜",
      "❓", "❔", "❕", "❗", "‼️", "⁉️", "🔅", "🔆", "🔱", "⚜️",
      "ℹ️", "🔔", "🔕", "🔒", "🔓", "🔑", "🔐",
    ]
  },
};

export function RichTextEditor({ value, onChange, placeholder, rows = 4 }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiSearchRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const insertTextAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    onChange(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const wrapSelection = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newValue = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
    onChange(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleBold = () => wrapSelection("**", "**");
  const handleItalic = () => wrapSelection("*", "*");

  const handleEmojiSelect = (emoji: string) => {
    insertTextAtCursor(emoji);
    setEmojiOpen(false);
    setSearchQuery("");
  };

  const categoryKeys = Object.keys(emojiCategories) as Array<keyof typeof emojiCategories>;

  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase();
    const results: string[] = [];
    
    // Search in individual emoji keywords first (precise)
    Object.entries(emojiKeywords).forEach(([emoji, keywords]) => {
      const matches = keywords.some(k => k.includes(query));
      if (matches && !results.includes(emoji)) {
        results.push(emoji);
      }
    });
    
    // Also search by category name
    Object.values(emojiCategories).forEach((category) => {
      if (category.name.toLowerCase().includes(query)) {
        category.emojis.forEach(emoji => {
          if (!results.includes(emoji)) {
            results.push(emoji);
          }
        });
      }
    });
    
    return results.slice(0, 80);
  }, [searchQuery]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 p-1 border rounded-t-md bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBold}
          className="h-8 w-8 p-0"
          title="Gras (sélectionnez du texte)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleItalic}
          className="h-8 w-8 p-0"
          title="Italique (sélectionnez du texte)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Popover open={emojiOpen} onOpenChange={(open) => { setEmojiOpen(open); if (!open) setSearchQuery(""); }}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Insérer un emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-80 p-2" 
            align="start"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              // Focus the search input after a short delay
              setTimeout(() => {
                emojiSearchRef.current?.focus();
              }, 0);
            }}
          >
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={emojiSearchRef}
                placeholder="Rechercher un emoji..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
                onKeyDown={(e) => {
                  // Prevent popover from closing on Escape while typing
                  if (e.key !== 'Escape') {
                    e.stopPropagation();
                  }
                }}
              />
            </div>
            
            {searchQuery.trim() ? (
              <ScrollArea className="h-48">
                <div className="grid grid-cols-8 gap-1">
                  {filteredEmojis?.map((emoji, idx) => (
                    <button
                      key={`${emoji}-${idx}`}
                      type="button"
                      className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded text-lg transition-colors"
                      onClick={() => handleEmojiSelect(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {filteredEmojis?.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">Aucun emoji trouvé</p>
                )}
              </ScrollArea>
            ) : (
              <Tabs defaultValue={categoryKeys[0]} className="w-full">
                <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-2">
                  {categoryKeys.map((key) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="h-8 w-8 p-0 data-[state=active]:bg-accent"
                      title={emojiCategories[key].name}
                    >
                      {key}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {categoryKeys.map((key) => (
                  <TabsContent key={key} value={key} className="mt-0">
                    <ScrollArea className="h-48">
                      <div className="grid grid-cols-8 gap-1">
                        {emojiCategories[key].emojis.map((emoji, idx) => (
                          <button
                            key={`${emoji}-${idx}`}
                            type="button"
                            className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded text-lg transition-colors"
                            onClick={() => handleEmojiSelect(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="rounded-t-none border-t-0"
      />
    </div>
  );
}
