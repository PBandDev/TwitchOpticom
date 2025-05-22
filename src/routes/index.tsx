import AuthScreen from "@/components/AuthScreen";
import ChannelList from "@/components/ChannelListing";
import { useAuth } from "@/contexts/AuthContext";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const { isAuthenticated, accessToken } = useAuth();

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <ChannelList accessToken={accessToken} />;
}
