export interface GameObject {
  x: number;
  y: number;
  radius: number;
  speed: number;
  dx: number;
  dy: number;
}

export interface Player extends GameObject {
  health: number;
  maxHealth: number;
  isInvincible: boolean;
  powerUps: {
    shield?: { active: boolean; duration: number };
    rapidFire?: { active: boolean; duration: number; level: number };
    multiShot?: { active: boolean; duration: number; level: number };
  };
  image?: HTMLImageElement;
}

export interface Enemy extends GameObject {
  health: number;
  maxHealth?: number;
  type: 'standard' | 'fast' | 'heavy' | 'boss';
  color: string;
  fireCooldown?: number;
  image?: HTMLImageElement;
  shotsFired?: number;
  isFiringLaser?: boolean;
  laserDuration?: number;
}

export interface Bullet extends GameObject {
  owner?: 'player' | 'enemy';
  color?: string;
  borderColor?: string;
}

export type PowerUpType = 'shield' | 'rapidFire' | 'health' | 'multiShot' | 'cure';

export interface PowerUp extends GameObject {
  type: PowerUpType;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

export interface StoryLevel {
  level: number;
  title: string;
  dialogue: string[];
  enemyCount: number;
  scoreToAdvance: number;
  boss: boolean;
  bossSpawned: boolean;
}

export interface Explosion {
  x: number;
  y: number;
  radius: number;
  image: HTMLImageElement;
  duration: number;
  elapsedTime: number;
}
