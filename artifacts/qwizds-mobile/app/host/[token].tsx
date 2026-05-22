import { useLocalSearchParams } from "expo-router";
import WebEmbed from "@/app/components/WebEmbed";

export default function HostScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <WebEmbed path={`/host/${token}`} title="Host Game" />;
}
