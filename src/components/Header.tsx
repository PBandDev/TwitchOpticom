import ChannelSearch from "@/components/ChannelSearch";
import { useTheme } from "@/components/ThemeProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Moon, Sun, Twitch } from "lucide-react";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between py-3 px-4 gap-4">
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Twitch className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg whitespace-nowrap">
              TwitchOpticon
            </span>
          </div>
          {isAuthenticated && (
            <div className="hidden md:flex flex-1 items-center w-full max-w-2xl">
              <ChannelSearch />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isAuthenticated && (
            <>
              <span className="hidden md:inline-block text-sm text-muted-foreground whitespace-nowrap mr-2">
                {user?.displayName}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="hidden sm:inline-flex items-center"
                  >
                    <LogOut className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you sure you want to logout?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will log you out of your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={logout}>
                      Logout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={logout}
                    className="sm:hidden"
                    aria-label="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you sure you want to logout?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will log you out of your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={logout}>
                      Logout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>

      {isAuthenticated && (
        <div className="md:hidden bg-background border-t border-border p-4">
          <ChannelSearch />
        </div>
      )}
    </header>
  );
}
