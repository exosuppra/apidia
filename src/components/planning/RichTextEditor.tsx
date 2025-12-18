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

const emojiCategories = {
  "😊": {
    name: "Visages",
    keywords: ["sourire", "rire", "triste", "pleurer", "colère", "love", "cool", "malade", "dormir", "peur"],
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
    keywords: ["main", "pouce", "ok", "victoire", "poing", "applaudir", "prier", "muscle", "doigt"],
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
    keywords: ["amour", "love", "coeur", "heart", "rouge", "rose", "bleu", "vert", "jaune"],
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️",
      "💌", "💋", "💯", "💢", "💥", "💫", "💦", "💨", "🕳️", "💣",
      "💬", "👁️‍🗨️", "🗨️", "🗯️", "💭", "💤", "✨", "⭐", "🌟", "💫",
    ]
  },
  "🎉": {
    name: "Fête",
    keywords: ["fête", "party", "cadeau", "anniversaire", "ballon", "confetti", "trophée", "médaille", "sport"],
    emojis: [
      "🎉", "🎊", "🎈", "🎁", "🎀", "🎂", "🍰", "🧁", "🥳", "🎄",
      "🎃", "🎗️", "🎟️", "🎫", "🎖️", "🏆", "🥇", "🥈", "🥉", "⚽",
      "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀",
      "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁",
    ]
  },
  "📝": {
    name: "Travail",
    keywords: ["travail", "bureau", "document", "fichier", "email", "calendrier", "note", "stylo", "livre", "graphique"],
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
    keywords: ["ordinateur", "téléphone", "tech", "argent", "euro", "dollar", "outil", "ampoule", "batterie"],
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
    keywords: ["nature", "plante", "arbre", "fleur", "soleil", "lune", "étoile", "pluie", "neige", "feu"],
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
    keywords: ["manger", "pizza", "burger", "gâteau", "café", "boisson", "fruit", "légume", "dessert"],
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
    keywords: ["voyage", "avion", "voiture", "train", "bus", "vélo", "bateau", "fusée", "transport"],
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
    keywords: ["ok", "valider", "erreur", "warning", "stop", "interdit", "rouge", "vert", "question"],
    emojis: [
      "✅", "❌", "⚠️", "🚫", "⛔", "📛", "🔴", "🟠", "🟡", "🟢",
      "🔵", "🟣", "🟤", "⚫", "⚪", "🔶", "🔷", "🔸", "🔹", "🔺",
      "🔻", "💠", "🔘", "🔳", "🔲", "▪️", "▫️", "◾", "◽", "◼️",
      "◻️", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "⬛", "⬜",
      "❓", "❔", "❕", "❗", "‼️", "⁉️", "🔅", "🔆", "🔱", "⚜️",
    ]
  },
};

export function RichTextEditor({ value, onChange, placeholder, rows = 4 }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    
    Object.values(emojiCategories).forEach((category) => {
      const keywordMatch = category.keywords.some(k => k.includes(query));
      if (keywordMatch || category.name.toLowerCase().includes(query)) {
        results.push(...category.emojis);
      } else {
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
          <PopoverContent className="w-80 p-2" align="start">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un emoji..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
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
