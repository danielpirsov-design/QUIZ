import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/contexts/LanguageContext";

import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import MyQuizzes from "@/pages/my-quizzes";
import QuizEditPage from "@/pages/quiz-edit";
import QuizDetailPage from "@/pages/quiz-detail";
import AIGeneratePage from "@/pages/ai-generate";
import JoinGamePage from "@/pages/join";
import HostGamePage from "@/pages/host";
import PlayGamePage from "@/pages/play";
import ResultsPage from "@/pages/results";
import DiscoverPage from "@/pages/discover";
import LanguagePage from "@/pages/language";
import LanguageCreatePage from "@/pages/language-create";
import LanguageStudyPage from "@/pages/language-study";
import WorksheetPage from "@/pages/worksheet";
import OnboardingPage from "@/pages/onboarding";
import PracticePage from "@/pages/practice";
import VolcanoPage from "@/pages/volcano";
import SettingsPage from "@/pages/settings";
import AdminPage from "@/pages/admin";
import VerifyPage from "@/pages/verify";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/my-quizzes" component={MyQuizzes} />
      <Route path="/quizzes/:id/edit" component={QuizEditPage} />
      <Route path="/quizzes/:id" component={QuizDetailPage} />
      <Route path="/ai-generate" component={AIGeneratePage} />
      <Route path="/join" component={JoinGamePage} />
      <Route path="/host/:token" component={HostGamePage} />
      <Route path="/play/:id" component={PlayGamePage} />
      <Route path="/results/:id" component={ResultsPage} />
      <Route path="/discover" component={DiscoverPage} />
      <Route path="/language" component={LanguagePage} />
      <Route path="/language/create" component={LanguageCreatePage} />
      <Route path="/language/:id" component={LanguageStudyPage} />
      <Route path="/worksheet" component={WorksheetPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/practice/:id" component={PracticePage} />
      <Route path="/volcano/:id" component={VolcanoPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/verify" component={VerifyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
