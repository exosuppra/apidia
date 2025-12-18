import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bold, Italic, Smile } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

const emojiCategories = {
  "😊": { // Smileys & People
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
  "👋": { // Gestures
    name: "Gestes",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
      "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍",
      "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝",
      "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂",
      "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅",
    ]
  },
  "❤️": { // Hearts & Symbols
    name: "Cœurs",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️",
      "💌", "💋", "💯", "💢", "💥", "💫", "💦", "💨", "🕳️", "💣",
      "💬", "👁️‍🗨️", "🗨️", "🗯️", "💭", "💤", "✨", "⭐", "🌟", "💫",
    ]
  },
  "🎉": { // Celebration
    name: "Fête",
    emojis: [
      "🎉", "🎊", "🎈", "🎁", "🎀", "🎂", "🍰", "🧁", "🥳", "🎄",
      "🎃", "🎗️", "🎟️", "🎫", "🎖️", "🏆", "🥇", "🥈", "🥉", "⚽",
      "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀",
      "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁",
    ]
  },
  "📝": { // Work & Objects
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
  "💻": { // Tech
    name: "Tech",
    emojis: [
      "💻", "🖥️", "🖨️", "⌨️", "🖱️", "🖲️", "💽", "💾", "💿", "📀",
      "📱", "📲", "☎️", "📞", "📟", "📠", "🔋", "🔌", "💡", "🔦",
      "🕯️", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "🪙", "💰",
      "💳", "💎", "⚖️", "🪜", "🧰", "🪛", "🔧", "🔨", "⚒️", "🛠️",
      "⛏️", "🪚", "🔩", "⚙️", "🪤", "🧲", "🔫", "💣", "🧨", "🪓",
    ]
  },
  "🌿": { // Nature
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
  "🍕": { // Food
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
  "🚀": { // Travel
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
  "⚠️": { // Alerts & Status
    name: "Alertes",
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
  };

  const categoryKeys = Object.keys(emojiCategories) as Array<keyof typeof emojiCategories>;

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
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
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
