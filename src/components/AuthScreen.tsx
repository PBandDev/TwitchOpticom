import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Twitch } from "lucide-react";

export default function AuthScreen() {
  const { login, isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
        <p className="text-lg">Logged in as {user?.displayName}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <Twitch className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to TwitchOpticon</CardTitle>
          <CardDescription>
            Track your favorite Twitch channels in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            onClick={login}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Twitch className="mr-2 h-4 w-4" />
            Login with Twitch
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Login with Twitch to start tracking your favorite channels
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
