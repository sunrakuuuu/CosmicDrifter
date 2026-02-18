
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Rocket, InfinityIcon, BookOpen, Volume2, VolumeX, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAudio } from '@/hooks/use-audio';

export default function Home() {
  const { isMuted, toggleMute, handleInteraction } = useAudio();
  const [playerName, setPlayerName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      setNameSubmitted(true);
    }
  };

  return (
    <main 
      className="flex min-h-screen w-full flex-col items-center justify-center p-4"
      onClick={handleInteraction}
    >
      <div className="absolute inset-0 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      <div className="absolute top-4 right-4 z-20">
          <Button onClick={toggleMute} variant="outline" size="icon">
            {isMuted ? <VolumeX /> : <Volume2 />}
            <span className="sr-only">Toggle Sound</span>
          </Button>
      </div>

      <div className="z-10 flex flex-col items-center text-center">
        <Rocket className="mb-6 h-20 w-20 text-primary" />
        <h1 className="font-headline text-6xl font-bold tracking-tighter text-primary md:text-8xl">
          Cosmic Drifter
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          A light suddenly came out of nowhere and all of humanity became a zombie and there is only one cure. The scientist discovered that the cure was on the International Space Station, but the thing is, it is lost in the Milky Way.
        </p>
        
        {nameSubmitted ? (
          <Card className="mt-12 w-full max-w-md animate-in fade-in duration-500">
            <CardHeader>
              <CardTitle>Welcome, {playerName}!</CardTitle>
              <CardDescription>Select a game mode to begin your journey.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Link href="/game?mode=story" passHref>
                <Button size="lg" className="w-full font-bold">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Story Mode
                </Button>
              </Link>
              <Link href="/game?mode=endless" passHref>
                <Button size="lg" variant="secondary" className="w-full font-bold">
                  <InfinityIcon className="mr-2 h-5 w-5" />
                  Endless Mode
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-12 w-full max-w-sm animate-in fade-in duration-500">
            <CardHeader>
              <CardTitle>Enter Your Name</CardTitle>
              <CardDescription>Please enter your name to begin.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Captain..."
                    className="pl-10"
                    required
                  />
                </div>
                <Button type="submit" size="lg" className="w-full font-bold">
                  Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
