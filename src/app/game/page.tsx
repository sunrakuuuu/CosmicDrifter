import { Suspense } from 'react';
import CosmicDrifterGame from '@/components/game/cosmic-drifter-game';
import { Skeleton } from '@/components/ui/skeleton';

function GameLoadingSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-4xl p-4">
        <Skeleton className="aspect-video w-full" />
        <div className="mt-4 flex justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}

export default function GamePage({
  searchParams,
}: {
  searchParams: { mode?: 'story' | 'endless' };
}) {
  const mode = searchParams.mode || 'endless';

  return (
    <main className="h-screen w-full overflow-hidden bg-background">
      <Suspense fallback={<GameLoadingSkeleton />}>
        <CosmicDrifterGame mode={mode} />
      </Suspense>
    </main>
  );
}
