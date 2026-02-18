"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { Home, RotateCw } from "lucide-react";

interface GameOverDialogProps {
  isOpen: boolean;
  score: number;
  onRestart: () => void;
}

export default function GameOverDialog({ isOpen, score, onRestart }: GameOverDialogProps) {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-headline text-3xl text-center">Game Over</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-lg pt-4">
            Your final score is:
            <span className="block font-headline text-5xl text-primary mt-2">{score}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center pt-4">
          <Link href="/" passHref>
            <AlertDialogCancel asChild>
              <div className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 mt-2 sm:mt-0 bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer">
                <Home className="h-4 w-4" />
                Main Menu
              </div>
            </AlertDialogCancel>
          </Link>
          <AlertDialogAction onClick={onRestart}>
            <RotateCw className="h-4 w-4" />
            Play Again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

    