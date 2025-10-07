import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Tag } from "@/types/planning";

interface TagSelectorProps {
  tags: Tag[];
  selectedTags: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagSelector({ tags, selectedTags, onChange }: TagSelectorProps) {
  const selectedTagObjects = tags.filter((tag) => selectedTags.includes(tag.id));
  const availableTags = tags.filter((tag) => !selectedTags.includes(tag.id));

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTags.filter((id) => id !== tagId));
  };

  const handleAddTag = (tagId: string) => {
    onChange([...selectedTags, tagId]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedTagObjects.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            style={{
              backgroundColor: `${tag.color}20`,
              borderColor: tag.color,
              color: tag.color,
            }}
            className="pr-1"
          >
            {tag.name}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1 hover:bg-transparent"
              onClick={() => handleRemoveTag(tag.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            Ajouter un tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher un tag..." />
            <CommandList>
              <CommandEmpty>Aucun tag trouvé.</CommandEmpty>
              <CommandGroup>
                {availableTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => handleAddTag(tag.id)}
                  >
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        borderColor: tag.color,
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
