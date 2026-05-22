import { useLocalSearchParams } from "expo-router";
import WebEmbed from "@/app/components/WebEmbed";

export default function QuizEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WebEmbed path={`/quiz-edit/${id}`} title="Quiz Editor" />;
}
