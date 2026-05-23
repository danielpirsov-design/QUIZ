import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getGameColor(index: number): string {
  const colors = [
    "bg-game-red",
    "bg-game-blue",
    "bg-game-yellow text-foreground", // yellow needs dark text for contrast
    "bg-game-green"
  ];
  return colors[index % colors.length];
}

export function getGameShape(index: number): string {
  const shapes = ["▲", "♦", "●", "■"];
  return shapes[index % shapes.length];
}
