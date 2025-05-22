import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTrackedChannels } from "@/hooks/useTrackedChannels";
import { useTwitchAuth } from "@/hooks/useTwitchAuth";
import {
  MIN_CHANNEL_SEARCH_QUERY_LENGTH,
  useChannelSearch,
} from "@/integrations/tanstack-query/queries";
import { useDebounce } from "@uidotdev/usehooks";
import { ChevronsUpDown, Circle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ChannelSearch() {
  const { accessToken } = useTwitchAuth();
  const {
    addChannel,
    trackedChannels,
    MAX_CHANNELS_MESSAGE: maxChannelsErrorMessage,
  } = useTrackedChannels();

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const debouncedSearch = useDebounce(searchTerm, 400);

  const { data: results = [], isFetching } = useChannelSearch({
    searchTerm: debouncedSearch,
    accessToken,
  });

  const handleSelect = (id: string): void => {
    const channel = results.find((r) => r.id === id);
    if (!channel) return;

    if (trackedChannels.length >= 100) {
      toast.error(maxChannelsErrorMessage);
      setOpen(false);
      return;
    }

    addChannel({ id: channel.id, displayName: channel.displayName });
    setSearchTerm("");
    setOpen(false);
  };

  const isMaxChannelsReached = trackedChannels.length >= 100;

  let commandEmptyContent = "Search for Twitch channels above.";
  if (
    debouncedSearch.length > 0 &&
    debouncedSearch.length < MIN_CHANNEL_SEARCH_QUERY_LENGTH
  ) {
    commandEmptyContent = `Type at least ${MIN_CHANNEL_SEARCH_QUERY_LENGTH} characters to search.`;
  } else if (
    debouncedSearch.length >= MIN_CHANNEL_SEARCH_QUERY_LENGTH &&
    results.length === 0 &&
    !isFetching
  ) {
    commandEmptyContent = `No channels found for "${debouncedSearch}".`;
  }

  const getInitials = (name: string) => {
    const nameParts = name.split(" ");
    if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    if (nameParts[0]) {
      return nameParts[0][0].toUpperCase();
    }
    return "?";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          // biome-ignore lint/a11y/useSemanticElements: Using button with combobox role for specific ARIA pattern
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className="w-full justify-between"
          disabled={isMaxChannelsReached}
        >
          {isMaxChannelsReached
            ? maxChannelsErrorMessage
            : "Search for a channel..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="center"
      >
        <Command>
          <CommandInput
            placeholder="Search Twitch channels..."
            className="h-9"
            value={searchTerm}
            onValueChange={setSearchTerm}
            disabled={isMaxChannelsReached}
          />
          <CommandList>
            {isFetching && (
              <div className="py-6 text-center text-sm">Loading...</div>
            )}
            {!isFetching && !isMaxChannelsReached && results.length === 0 && (
              <CommandEmpty>{commandEmptyContent}</CommandEmpty>
            )}
            {!isFetching && !isMaxChannelsReached && results.length > 0 && (
              <CommandGroup>
                {results.map((channel) => (
                  <CommandItem
                    key={channel.id}
                    value={channel.displayName}
                    onSelect={() => handleSelect(channel.id)}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="w-[22px] h-[22px] flex-shrink-0 border">
                      <AvatarImage
                        src={channel.profilePictureUrl}
                        alt={`${channel.displayName} avatar`}
                      />
                      <AvatarFallback>
                        {getInitials(channel.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-grow truncate">
                      {channel.displayName}
                    </span>
                    {channel.isOnline && (
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Circle className="h-2.5 w-2.5 text-red-500 fill-red-500 flex-shrink-0 animate-pulse" />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Live</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {isMaxChannelsReached && !isFetching && (
              <CommandEmpty>{maxChannelsErrorMessage}</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
