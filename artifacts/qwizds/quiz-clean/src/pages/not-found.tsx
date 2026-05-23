import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-9xl font-display font-black text-primary mb-4">404</h1>
        <h2 className="text-3xl font-bold text-foreground mb-6">Page not found</h2>
        <p className="text-muted-foreground font-medium mb-8 max-w-md">
          Oops! Looks like this page got lost in the game. Let's get you back to the action.
        </p>
        <Link href="/">
          <Button size="lg" className="rounded-xl font-bold btn-game-3d">
            Return Home
          </Button>
        </Link>
      </div>
    </AppLayout>
  );
}
