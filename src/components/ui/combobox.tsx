import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import type { Channel, SearchResult } from "@/lib/types";

interface ComboboxProps {
  channels: (Channel | SearchResult)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Combobox({
  channels,
  value,
  onChange,
  placeholder = "Select channel...",
  emptyText = "No channel found.",
  className,
  open,
  onOpenChange,
}: ComboboxProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value
            ? channels.find((channel) => channel.id === value)?.displayName
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}`}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {channels.map((channel) => (
                <CommandItem
                  key={channel.id}
                  value={channel.id}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    onOpenChange(false);
                  }}
                >
                  {channel.displayName}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === channel.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
