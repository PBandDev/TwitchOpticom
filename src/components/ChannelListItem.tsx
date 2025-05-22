import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Channel } from "@/lib/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Circle, GripVertical, Trash2 } from "lucide-react";

interface ChannelListItemProps {
  channel: Channel;
  onRemove: (id: string, displayName?: string) => void;
}

export default function ChannelListItem({
  channel,
  onRemove,
}: ChannelListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: channel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getInitials = (name: string) => {
    const nameParts = name.split(" ");
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      key={channel.id}
      className="group flex items-center justify-between rounded-md border p-2 hover:bg-muted/40 transition-colors touch-none bg-background min-h-[48px]"
    >
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-2 flex-grow min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-grab touch-none p-0.5 h-auto text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <Avatar className="w-7 h-7 flex-shrink-0 border">
            <AvatarImage
              src={channel.profilePictureUrl}
              alt={`${channel.displayName} avatar`}
            />
            <AvatarFallback>{getInitials(channel.displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm leading-tight truncate break-all max-w-[120px] sm:max-w-[160px] md:max-w-[200px]">
              {channel.displayName}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Circle
                    className={
                      channel.isOnline
                        ? "h-2 w-2 text-red-500 fill-red-500 animate-pulse"
                        : "h-2 w-2 text-gray-400 fill-gray-400"
                    }
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{channel.isOnline ? "Live" : "Offline"}</p>
                </TooltipContent>
              </Tooltip>
              {!channel.isOnline && <span className="text-xs">Offline</span>}
              {channel.isOnline && channel.viewerCount !== null && (
                <span className="text-xs">
                  {channel.viewerCount.toLocaleString()} viewers
                </span>
              )}
            </div>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 p-0.5"
              onClick={() => onRemove(channel.id, channel.displayName)}
              aria-label={`Remove ${channel.displayName}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Remove {channel.displayName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </li>
  );
}
