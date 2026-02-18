

"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Player, Enemy, Bullet, PowerUp, Star, StoryLevel, Explosion } from '@/lib/types';
import { getAdaptiveDifficulty } from '@/app/actions';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Play, Pause, Home, Volume2, VolumeX } from 'lucide-react';
import GameOverDialog from './game-over-dialog';
import { cn } from '@/lib/utils';
import { useAudio } from '@/hooks/use-audio';

type NotificationType = 'powerup' | 'boss';
interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

const storyLevels: StoryLevel[] = [
  { level: 1, title: "The Anomaly", dialogue: ["Captain, we've found a piece of the space station.", "Something is guarding it.", "Let's retrieve the first part of the cure."], enemyCount: 10, boss: true, bossSpawned: false },
  { level: 2, title: "First Contact", dialogue: ["Another section of the station!", "They don't seem friendly. Defend yourself to get the next piece!"], enemyCount: 20, boss: true, bossSpawned: false },
  { level: 3, title: "The Swarm", dialogue: ["They're coming in waves!", "Hold them off while we analyze their patterns. We need that third piece!"], enemyCount: 30, boss: true, bossSpawned: false },
  { level: 4, title: "The Source", dialogue: ["A massive vessel is guarding the final section!", "This is it. Take it down and secure the final piece of the cure!"], enemyCount: 40, boss: true, bossSpawned: false },
  { level: 5, title: "Humanity's Hope", dialogue: ["You did it! You secured the final piece of the cure.", "Let's get it home..."], enemyCount: 0, boss: false, bossSpawned: false },
];

const CosmicDrifterGame = ({ mode }: { mode: 'story' | 'endless' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isMuted, toggleMute } = useAudio();

  // Game state
  const [gameState, setGameState] = useState<'loading' | 'menu' | 'playing' | 'paused' | 'gameOver' | 'levelTransition' | 'storyEnd'>('loading');
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [curesCollected, setCuresCollected] = useState(0);
  const [currentDialogue, setCurrentDialogue] = useState<string[]>([]);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [isBossFight, setIsBossFight] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const enemiesToSpawnRef = useRef(0);
  const storyLevelsRef = useRef<StoryLevel[]>(JSON.parse(JSON.stringify(storyLevels)));
  const [, setFrame] = useState(0);


  // Refs for game objects to avoid re-renders in game loop
  const playerRef = useRef<Player>();
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const starsRef = useRef<Star[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const gameTimeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const difficultySettingsRef = useRef({ enemySpawnRate: 1, enemyAttackPower: 1, enemySpeed: 1, powerUpFrequency: 0.1 });
  const fireCooldownRef = useRef(0);
  const playerImageRef = useRef<HTMLImageElement>();
  const enemyImageRef = useRef<HTMLImageElement>();
  const boss1ImageRef = useRef<HTMLImageElement>();
  const boss2ImageRef = useRef<HTMLImageElement>();
  const boss3ImageRef = useRef<HTMLImageElement>();
  const boss4ImageRef = useRef<HTMLImageElement>();
  const explosionImageRef = useRef<HTMLImageElement>();
  const shootingSoundRef = useRef<HTMLAudioElement>();
  const explosionSoundRef = useRef<HTMLAudioElement>();
  const isPointerDownRef = useRef(false);

  const showNotification = useCallback((message: string, type: NotificationType) => {
    const newNotification = { id: Date.now(), message, type };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 1000);
  }, []);

  const startLevel = useCallback((level: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const levelData = storyLevelsRef.current[level - 1];
    if (!levelData) return;
    
    setCurrentLevel(level);
    enemiesToSpawnRef.current = levelData.enemyCount;
    setIsBossFight(false);
    levelData.bossSpawned = false;

    if (mode === 'story') {
      setCurrentDialogue(levelData.dialogue);
      setDialogueIndex(0);
      setGameState('levelTransition');
    } else {
      setGameState('playing');
    }
  }, [mode]);

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    storyLevelsRef.current = JSON.parse(JSON.stringify(storyLevels));

    playerRef.current = {
      x: canvas.width / 2, y: canvas.height - 80, radius: 25, speed: 250, health: 100, maxHealth: 100,
      dx: 0, dy: 0, isInvincible: false, powerUps: {}, image: playerImageRef.current
    };
    enemiesRef.current = [];
    bulletsRef.current = [];
    powerUpsRef.current = [];
    explosionsRef.current = [];
    setScore(0);
    setCurrentLevel(1);
    if(mode === 'story') setCuresCollected(0);
    gameTimeRef.current = 0;
    setIsBossFight(false);
    setGameState('menu');
  }, [mode]);

  const startGame = useCallback(() => {
    startLevel(1);
  }, [startLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let playerImageLoaded = false;
    let enemyImageLoaded = false;
    let boss1ImageLoaded = false;
    let boss2ImageLoaded = false;
    let boss3ImageLoaded = false;
    let boss4ImageLoaded = false;
    let explosionImageLoaded = false;

    const checkAllAssetsLoaded = () => {
        if(playerImageLoaded && enemyImageLoaded && boss1ImageLoaded && boss2ImageLoaded && boss3ImageLoaded && boss4ImageLoaded && explosionImageLoaded) {
            resetGame();
        }
    }
    
    const shootingSound = new Audio('/shootingsound.mp3');
    shootingSound.oncanplaythrough = () => {
        shootingSoundRef.current = shootingSound;
    };
    shootingSound.onerror = () => {
        console.error("Failed to load shooting sound.");
    }
    
    const explosionSound = new Audio('/explosion.mp3');
    explosionSound.oncanplaythrough = () => {
        explosionSoundRef.current = explosionSound;
    };
    explosionSound.onerror = () => {
        console.error("Failed to load explosion sound.");
    }

    const pImg = new Image();
    pImg.src = '/spaceship.png';
    pImg.onload = () => {
      playerImageRef.current = pImg;
      playerImageLoaded = true;
      checkAllAssetsLoaded();
    }
    pImg.onerror = () => {
      console.error("Failed to load player ship image. Using fallback.");
      playerImageLoaded = true;
      checkAllAssetsLoaded();
    }

    const eImg = new Image();
    eImg.src = '/enemy.png';
    eImg.onload = () => {
        enemyImageRef.current = eImg;
        enemyImageLoaded = true;
        checkAllAssetsLoaded();
    }
    eImg.onerror = () => {
        console.error("Failed to load enemy image. Using fallback.");
        enemyImageLoaded = true;
        checkAllAssetsLoaded();
    }
    
    const b1Img = new Image();
    b1Img.src = '/boss1.png';
    b1Img.onload = () => {
        boss1ImageRef.current = b1Img;
        boss1ImageLoaded = true;
        checkAllAssetsLoaded();
    }
    b1Img.onerror = () => {
        console.error("Failed to load boss1 image. Using fallback.");
        boss1ImageLoaded = true;
        checkAllAssetsLoaded();
    }
    
    const b2Img = new Image();
    b2Img.src = '/boss2.png';
    b2Img.onload = () => {
        boss2ImageRef.current = b2Img;
        boss2ImageLoaded = true;
        checkAllAssetsLoaded();
    }
    b2Img.onerror = () => {
        console.error("Failed to load boss2 image. Using fallback.");
        boss2ImageLoaded = true;
        checkAllAssetsLoaded();
    }

    const b3Img = new Image();
    b3Img.src = '/boss3.png';
    b3Img.onload = () => {
        boss3ImageRef.current = b3Img;
        boss3ImageLoaded = true;
        checkAllAssetsLoaded();
    }
    b3Img.onerror = () => {
        console.error("Failed to load boss3 image. Using fallback.");
        boss3ImageLoaded = true;
        checkAllAssetsLoaded();
    }
    
    const b4Img = new Image();
    b4Img.src = '/boss4.png';
    b4Img.onload = () => {
        boss4ImageRef.current = b4Img;
        boss4ImageLoaded = true;
        checkAllAssetsLoaded();
    }
    b4Img.onerror = () => {
        console.error("Failed to load boss4 image. Using fallback.");
        boss4ImageLoaded = true;
        checkAllAssetsLoaded();
    }

    const exImg = new Image();
    exImg.src = '/explosion.png';
    exImg.onload = () => {
        explosionImageRef.current = exImg;
        explosionImageLoaded = true;
        checkAllAssetsLoaded();
    }
    exImg.onerror = () => {
        console.error("Failed to load explosion image. Using fallback.");
        explosionImageLoaded = true;
        checkAllAssetsLoaded();
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    starsRef.current = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 30 + 10,
    }));
  }, [resetGame]);

  const handleNextDialogue = () => {
    if (dialogueIndex < currentDialogue.length - 1) {
      setDialogueIndex(prev => prev + 1);
    } else {
      setGameState('playing');
    }
  };

  const advanceLevel = () => {
    if (mode === 'story') {
      const nextLevelIndex = storyLevelsRef.current.findIndex(l => l.level === currentLevel + 1);
      if (nextLevelIndex !== -1 && storyLevelsRef.current[nextLevelIndex]) {
        startLevel(currentLevel + 1);
      } else {
        setGameState('storyEnd');
      }
    }
  };

  const spawnBoss = (canvas: HTMLCanvasElement) => {
    if (!canvas) return;
    const levelData = storyLevelsRef.current[currentLevel - 1];
    if (!levelData || levelData.bossSpawned) return;

    const bossHealth = 20 * currentLevel * currentLevel;
    const getBossImage = () => {
        if (currentLevel === 1) return boss1ImageRef.current;
        if (currentLevel === 2) return boss2ImageRef.current;
        if (currentLevel === 3) return boss3ImageRef.current;
        if (currentLevel === 4) return boss4ImageRef.current;
        return undefined;
    }
    const newBoss: Enemy = {
      x: canvas.width / 2, y: 100, radius: 40, speed: 100,
      health: bossHealth, maxHealth: bossHealth, type: 'boss', color: '#D82E2E',
      dx: Math.random() < 0.5 ? 1 : -1, dy: 0, fireCooldown: 1,
      image: getBossImage(), shotsFired: 0,
    };

    enemiesRef.current.push(newBoss);
    setIsBossFight(true);
    levelData.bossSpawned = true;
    showNotification("Boss Incoming!", 'boss');
  };

  const spawnEnemies = (count: number, canvas: HTMLCanvasElement) => {
      for(let i = 0; i < count; i++) {
        let enemyHealth = 1;
        if (currentLevel === 3) {
            enemyHealth = 3;
        } else if (currentLevel >= 4) {
            enemyHealth = 4;
        }

        enemiesRef.current.push({
            x: Math.random() * canvas.width, y: -20, radius: 35, speed: 50 + Math.random() * 50 * difficultySettingsRef.current.enemySpeed,
            health: enemyHealth, type: 'standard', color: '#FF5A5A', dx: 0, dy: 1, fireCooldown: Math.random() * 0.5 + 0.1,
            image: enemyImageRef.current
        });
      }
  }
  
  // AI Difficulty Adjustment (for endless mode)
  useEffect(() => {
    if (mode !== 'endless') return;
    const interval = setInterval(async () => {
      if (gameState === 'playing' && playerRef.current) {
        const settings = await getAdaptiveDifficulty({
          playerScore: score,
          level: currentLevel,
          enemiesDefeated: score / 10,
          powerUpsCollected: 0, // Placeholder
          gameTime: gameTimeRef.current,
        });
        difficultySettingsRef.current = settings;
      }
    }, 15000); // Adjust difficulty every 15 seconds
    return () => clearInterval(interval);
  }, [gameState, score, currentLevel, mode]);

  // Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;

    const gameLoop = (timestamp: number) => {
      const deltaTime = (timestamp - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Stars
      starsRef.current.forEach(star => {
        star.y += star.speed * deltaTime;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
        ctx.fillStyle = 'white';
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });
      
      if (gameState === 'playing') {
        gameTimeRef.current += deltaTime;
        update(deltaTime);
        setFrame(frame => frame + 1);
      }

      draw(ctx);
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    const update = (dt: number) => {
      const p = playerRef.current;
      if (!p) return;

      // Update power-ups timers
      if (p.powerUps.multiShot?.active) {
        p.powerUps.multiShot.duration -= dt;
        if (p.powerUps.multiShot.duration <= 0) {
          p.powerUps.multiShot.active = false;
        }
      }
      if (p.powerUps.rapidFire?.active) {
        p.powerUps.rapidFire.duration -= dt;
        if (p.powerUps.rapidFire.duration <= 0) {
          p.powerUps.rapidFire.active = false;
        }
      }
      
      // Reset velocity from keys, pointer move will override if active if pointer is down
      if(!isPointerDownRef.current) {
        p.dx = 0;
        p.dy = 0;
      }

      // Keyboard movement
      if (keysRef.current['arrowup'] || keysRef.current['w']) p.dy = -1;
      if (keysRef.current['arrowdown'] || keysRef.current['s']) p.dy = 1;
      if (keysRef.current['arrowleft'] || keysRef.current['a']) p.dx = -1;
      if (keysRef.current['arrowright'] || keysRef.current['d']) p.dx = 1;

      // Normalize diagonal movement
      if (p.dx !== 0 && p.dy !== 0) {
        const length = Math.sqrt(p.dx * p.dx + p.dy * p.dy);
        p.dx /= length;
        p.dy /= length;
      }
      
      // Player movement
      p.x += p.dx * p.speed * dt;
      p.y += p.dy * p.speed * dt;
      p.x = Math.max(p.radius, Math.min(canvas.width - p.radius, p.x));
      p.y = Math.max(p.radius, Math.min(canvas.height - p.radius, p.y));

      // Auto-fire
      fireCooldownRef.current -= dt;
      if (fireCooldownRef.current <= 0) {
        const rapidFireLevel = p.powerUps.rapidFire?.level || 0;
        fireCooldownRef.current = 0.25 - (rapidFireLevel * 0.05); // Fire rate
        
        if (shootingSoundRef.current && !isMuted) {
          shootingSoundRef.current.currentTime = 0;
          shootingSoundRef.current.play().catch(e => console.log("Shooting sound play interrupted."));
        }

        const multiShotLevel = p.powerUps.multiShot?.level || 1;
        
        if (multiShotLevel === 1) {
            bulletsRef.current.push({ owner: 'player', x: p.x, y: p.y - p.radius, radius: 5, speed: 500, dx: 0, dy: -1 });
        } else if (multiShotLevel === 2) {
            bulletsRef.current.push({ owner: 'player', x: p.x - 10, y: p.y - p.radius, radius: 5, speed: 500, dx: 0, dy: -1 });
            bulletsRef.current.push({ owner: 'player', x: p.x + 10, y: p.y - p.radius, radius: 5, speed: 500, dx: 0, dy: -1 });
        } else { // 3 or more
            bulletsRef.current.push({ owner: 'player', x: p.x, y: p.y - p.radius, radius: 5, speed: 500, dx: 0, dy: -1 });
            bulletsRef.current.push({ owner: 'player', x: p.x - 15, y: p.y - p.radius, radius: 5, speed: 500, dx: -0.1, dy: -1 });
            bulletsRef.current.push({ owner: 'player', x: p.x + 15, y: p.y - p.radius, radius: 5, speed: 500, dx: 0.1, dy: -1 });
        }
      }

      // Update bullets
      bulletsRef.current.forEach((b, i) => {
        b.y += b.dy * b.speed * dt;
        b.x += b.dx * b.speed * dt;
        if (b.y < 0 || b.y > canvas.height) bulletsRef.current.splice(i, 1);
      });

      // Update explosions
      explosionsRef.current.forEach((exp, i) => {
        exp.elapsedTime += dt;
        if (exp.elapsedTime >= exp.duration) {
          explosionsRef.current.splice(i, 1);
        }
      });
      
      // Spawn enemies
      const spawnRate = mode === 'endless' ? difficultySettingsRef.current.enemySpawnRate : 2;
      const shouldSpawnStoryEnemy = mode === 'story' && enemiesToSpawnRef.current > 0 && !isBossFight;

      if ((shouldSpawnStoryEnemy || mode === 'endless') && Math.random() < 0.01 * spawnRate) {
        spawnEnemies(1, canvas);
        if(shouldSpawnStoryEnemy) enemiesToSpawnRef.current--;
      }
      
      // Update power-ups
      powerUpsRef.current.forEach((pu, i) => {
        pu.y += pu.speed * dt;
        if (pu.y > canvas.height + pu.radius) {
          powerUpsRef.current.splice(i, 1);
        }
      });

      // Update enemies
      enemiesRef.current.forEach((e, i) => {
        if (e.type === 'boss') {
            e.x += e.dx * e.speed * dt;
            if (e.x < e.radius || e.x > canvas.width - e.radius) {
                e.dx *= -1;
            }

            if(e.isFiringLaser && e.laserDuration) {
              e.laserDuration -= dt;
              if (e.laserDuration <= 0) {
                e.isFiringLaser = false;
              }
            }

            if(e.fireCooldown){
              e.fireCooldown -= dt;
              if (e.fireCooldown <= 0) {
                  e.fireCooldown = 1.5 - (currentLevel * 0.1);
                  e.shotsFired = (e.shotsFired || 0) + 1;
                  const angleToPlayer = Math.atan2(p.y - e.y, p.x - e.x);
                  const baseSpeed = 200;

                  const getBulletColor = () => {
                      if(currentLevel === 1) return 'yellow';
                      if(currentLevel === 2) return 'red';
                      if(currentLevel === 3) return 'orange';
                      return 'black';
                  }
                  
                  const getBulletBorderColor = () => {
                    if (currentLevel === 4) return 'red';
                    return undefined;
                  }

                  // Special attack every 5 shots
                  if (e.shotsFired % 5 === 0) {
                    if(currentLevel === 1) { // Lvl 1: Big bullet
                        bulletsRef.current.push({ owner: 'enemy', x: e.x, y: e.y, radius: 15, speed: baseSpeed * 0.8, dx: Math.cos(angleToPlayer), dy: Math.sin(angleToPlayer), color: getBulletColor() });
                    } else if (currentLevel === 2) { // Lvl 2: 2 Big bullets
                        const spread = 0.2;
                        bulletsRef.current.push({ owner: 'enemy', x: e.x, y: e.y, radius: 15, speed: baseSpeed * 0.8, dx: Math.cos(angleToPlayer - spread), dy: Math.sin(angleToPlayer - spread), color: getBulletColor() });
                        bulletsRef.current.push({ owner: 'enemy', x: e.x, y: e.y, radius: 15, speed: baseSpeed * 0.8, dx: Math.cos(angleToPlayer + spread), dy: Math.sin(angleToPlayer + spread), color: getBulletColor() });
                    } else if (currentLevel === 3) { // Lvl 3: Laser
                        e.isFiringLaser = true;
                        e.laserDuration = 1.5; // seconds
                    } else if (currentLevel === 4) { // Lvl 4: Laser + spawn enemies
                        e.isFiringLaser = true;
                        e.laserDuration = 1.5;
                        spawnEnemies(5, canvas);
                    }
                  } else {
                    // Regular attack
                    const bulletProps = {
                      owner: 'enemy' as const,
                      x: e.x,
                      y: e.y,
                      radius: 8,
                      speed: baseSpeed,
                      color: getBulletColor(),
                      borderColor: getBulletBorderColor(),
                    };

                    if (currentLevel === 1) {
                      bulletsRef.current.push({ ...bulletProps, dx: Math.cos(angleToPlayer), dy: Math.sin(angleToPlayer) });
                    } else if (currentLevel === 2) {
                      const spread = 0.15; // Radians
                      bulletsRef.current.push({ ...bulletProps, dx: Math.cos(angleToPlayer - spread), dy: Math.sin(angleToPlayer - spread) });
                      bulletsRef.current.push({ ...bulletProps, dx: Math.cos(angleToPlayer + spread), dy: Math.sin(angleToPlayer + spread) });
                    } else { // Level 3 and 4
                      const spread = 0.25; // Radians
                      bulletsRef.current.push({ ...bulletProps, dx: Math.cos(angleToPlayer), dy: Math.sin(angleToPlayer) });
                      bulletsRef.current.push({ ...bulletProps, dx: Math.cos(angleToPlayer - spread), dy: Math.sin(angleToPlayer - spread) });
                      bulletsRef.current.push({ ...bulletProps, dx: Math.cos(angleToPlayer + spread), dy: Math.sin(angleToPlayer + spread) });
                    }
                  }
              }
            }
        } else {
            e.y += e.dy * e.speed * dt;
            if (currentLevel > 1 && e.fireCooldown) {
                e.fireCooldown -= dt;
                if (e.fireCooldown <= 0) {
                    e.fireCooldown = 3; // Reset cooldown
                    const angleToPlayer = Math.atan2(p.y - e.y, p.x - e.x);

                    if (currentLevel >= 4) {
                      // Level 4+: Fires 2 bullets
                      const spread = 0.2; // Radians
                      bulletsRef.current.push({ owner: 'enemy', x: e.x, y: e.y, radius: 5, speed: 150, dx: Math.cos(angleToPlayer - spread), dy: Math.sin(angleToPlayer - spread) });
                      bulletsRef.current.push({ owner: 'enemy', x: e.x, y: e.y, radius: 5, speed: 150, dx: Math.cos(angleToPlayer + spread), dy: Math.sin(angleToPlayer + spread) });
                    } else {
                      // Levels 2 & 3: Fires 1 bullet
                      bulletsRef.current.push({ owner: 'enemy', x: e.x, y: e.y, radius: 5, speed: 150, dx: Math.cos(angleToPlayer), dy: Math.sin(angleToPlayer) });
                    }
                }
            }
        }
        if (e.y > canvas.height + e.radius) enemiesRef.current.splice(i, 1);
      });

      // Collision detection: Player Bullets vs Enemies
      bulletsRef.current.forEach((b, bi) => {
        if (b.owner !== 'player') return;
        enemiesRef.current.forEach((e, ei) => {
          const dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist < b.radius + e.radius) {
            bulletsRef.current.splice(bi, 1);
            e.health -= 1;
            if (e.health <= 0) {
              const enemyScore = e.type === 'boss' ? 100 : 10;
              setScore(s => s + enemyScore);
              
              if (e.type === 'boss') {
                  if (explosionSoundRef.current && !isMuted) {
                    explosionSoundRef.current.currentTime = 0;
                    explosionSoundRef.current.play().catch(e => console.log("Explosion sound play interrupted."));
                  }
                  powerUpsRef.current.push({ x: e.x, y: e.y, radius: 15, speed: 100, dx: 0, dy: 1, type: 'cure' });
                  
                  const powerUpType: PowerUp['type'] = currentLevel % 2 !== 0 ? 'multiShot' : 'rapidFire';
                  const powerUpDropX = e.x + (currentLevel % 2 === 0 ? 30 : -30);
                  powerUpsRef.current.push({ x: powerUpDropX, y: e.y, radius: 12, speed: 100, dx: 0, dy: 1, type: powerUpType });

                  if (explosionImageRef.current) {
                    explosionsRef.current.push({
                      x: e.x,
                      y: e.y,
                      radius: e.radius * 2,
                      image: explosionImageRef.current,
                      duration: 0.5,
                      elapsedTime: 0,
                    });
                  }

                  setIsBossFight(false);
              }
              
              enemiesRef.current.splice(ei, 1);
            }
          }
        });
      });
      
      const handlePlayerDeath = () => {
        if (explosionSoundRef.current && !isMuted) {
          explosionSoundRef.current.currentTime = 0;
          explosionSoundRef.current.play().catch(e => console.log("Explosion sound play interrupted."));
        }
        setGameState('gameOver');
      }

      // Collision detection: Player vs Enemy & Enemy Bullets
      enemiesRef.current.forEach((e, ei) => {
         if (!p.isInvincible) {
            const dist = Math.hypot(p.x - e.x, p.y - e.y);
            if (dist < p.radius + e.radius) {
                if (e.type !== 'boss') enemiesRef.current.splice(ei, 1);
                p.health -= 25;
                if(p.health <= 0) handlePlayerDeath();
            }
         }
         // Collision: player vs boss laser
         if(e.type === 'boss' && e.isFiringLaser && !p.isInvincible) {
            const laserWidth = 10;
            const laserX = e.x - laserWidth / 2;
            const laserY = e.y;
            
            // AABB collision check
            if (p.x > laserX && p.x < laserX + laserWidth && p.y > laserY) {
                p.health -= 5;
                if(p.health <= 0) handlePlayerDeath();
            }
         }

      });
      bulletsRef.current.forEach((b, bi) => {
        if (b.owner !== 'enemy' || p.isInvincible) return;
        const dist = Math.hypot(p.x - b.x, p.y - b.y);
        if (dist < p.radius + b.radius) {
          bulletsRef.current.splice(bi, 1);
          p.health -= 15;
          if (p.health <= 0) handlePlayerDeath();
        }
      });
      
      // Collision detection: Player vs Power-ups
      powerUpsRef.current.forEach((pu, i) => {
        const dist = Math.hypot(p.x - pu.x, p.y - pu.y);
        if (dist < p.radius + pu.radius) {
          powerUpsRef.current.splice(i, 1);
          if (pu.type === 'multiShot') {
              const currentLevel = p.powerUps.multiShot?.level || 1;
              if (currentLevel < 3) {
                p.powerUps.multiShot = { active: true, duration: 8, level: currentLevel + 1 };
                showNotification("Weapon Upgrade!", 'powerup');
              } else {
                const currentRapidFire = p.powerUps.rapidFire?.level || 0;
                p.powerUps.rapidFire = { active: true, duration: 8, level: Math.min(currentRapidFire + 1, 4) };
                showNotification("Fire Rate Increased!", 'powerup');
              }
          } else if (pu.type === 'rapidFire') {
              const currentRapidFire = p.powerUps.rapidFire?.level || 0;
              p.powerUps.rapidFire = { active: true, duration: 8, level: Math.min(currentRapidFire + 1, 4) };
              showNotification("Fire Rate Increased!", 'powerup');
          } else if (pu.type === 'cure') {
            setCuresCollected(c => c + 1);
            showNotification("Cure Collected!", 'powerup');
            if (mode === 'story') {
              advanceLevel();
            }
          }
        }
      });
      
      // Story mode level completion & Boss spawn
      if (mode === 'story' && !isBossFight && enemiesToSpawnRef.current <= 0 && enemiesRef.current.length === 0) {
        const levelData = storyLevelsRef.current[currentLevel - 1];
        if (levelData && levelData.boss && !levelData.bossSpawned) {
          spawnBoss(canvas);
        }
      }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const p = playerRef.current;
      if (p) {
        // Draw player
        if (p.image && p.image.complete && p.image.naturalHeight !== 0) {
          const width = p.radius * 2;
          const height = p.radius * 2;
          ctx.drawImage(p.image, p.x - p.radius, p.y - p.radius, width, height);
        } else {
          ctx.fillStyle = p.powerUps.multiShot?.active ? '#FFD700' : '#A050BE';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - p.radius);
          ctx.lineTo(p.x - p.radius * 0.8, p.y + p.radius * 0.8);
          ctx.lineTo(p.x + p.radius * 0.8, p.y + p.radius * 0.8);
          ctx.closePath();
          ctx.fill();
        }
      }
      
      // Draw bullets
      bulletsRef.current.forEach(b => {
        ctx.fillStyle = b.owner === 'player' ? '#50B0BE' : (b.color || '#FFA500');
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        if (b.borderColor) {
          ctx.strokeStyle = b.borderColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
      
      // Draw enemies
      enemiesRef.current.forEach(e => {
        // Draw boss laser
        if (e.type === 'boss' && e.isFiringLaser) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            const laserWidth = 10;
            ctx.fillRect(e.x - laserWidth / 2, e.y, laserWidth, canvas.height);
        }
        
        if (e.image && e.image.complete && e.image.naturalHeight !== 0) {
          const width = e.radius * 2;
          const height = e.radius * 2;
          ctx.drawImage(e.image, e.x - e.radius, e.y - e.radius, width, height);
        } else {
          ctx.fillStyle = e.color;
          if (e.type === 'boss') {
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2);
          }
        }

        // Draw boss health bar
        if (e.type === 'boss' && e.maxHealth) {
          const barWidth = e.radius * 2;
          const barHeight = 10;
          const barX = e.x - e.radius;
          const barY = e.y - e.radius - 20;
          const healthPercentage = e.health / e.maxHealth;
          
          ctx.fillStyle = '#444';
          ctx.fillRect(barX, barY, barWidth, barHeight);
          
          ctx.fillStyle = '#D82E2E';
          ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);

          ctx.strokeStyle = 'white';
          ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
      });

      // Draw power-ups
      powerUpsRef.current.forEach(pu => {
          if (pu.type === 'multiShot') {
            ctx.fillStyle = '#FFD700';
            ctx.save();
            ctx.translate(pu.x, pu.y);
            ctx.rotate(gameTimeRef.current * 2);
            ctx.fillRect(-pu.radius, -pu.radius, pu.radius * 2, pu.radius * 2);
            ctx.restore();
            ctx.fillStyle = 'black';
            ctx.fillText('W', pu.x-4, pu.y+4)
          } else if (pu.type === 'rapidFire') {
            ctx.fillStyle = '#50B0BE';
            ctx.save();
            ctx.translate(pu.x, pu.y);
            ctx.rotate(gameTimeRef.current * -2);
            ctx.fillRect(-pu.radius, -pu.radius, pu.radius * 2, pu.radius * 2);
            ctx.restore();
            ctx.fillStyle = 'white';
            ctx.fillText('F', pu.x-3, pu.y+4)
          } else if (pu.type === 'cure') {
            ctx.fillStyle = '#4CFF7E'; // A nice green for the cure
            ctx.beginPath();
            ctx.arc(pu.x, pu.y, pu.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('C', pu.x-4, pu.y+4);
          }
      });

      // Draw explosions
      explosionsRef.current.forEach(exp => {
        if (exp.image && exp.image.complete && exp.image.naturalHeight !== 0) {
          const width = exp.radius * 2;
          const height = exp.radius * 2;
          ctx.drawImage(exp.image, exp.x - exp.radius, exp.y - exp.radius, width, height);
        }
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
        if (gameState !== 'playing' || !playerRef.current || !isPointerDownRef.current) return;
        const rect = canvas.getBoundingClientRect();
        const targetX = e.clientX - rect.left;
        const targetY = e.clientY - rect.top;
        const p = playerRef.current;
        
        const angle = Math.atan2(targetY - p.y, targetX - p.x);
        p.dx = Math.cos(angle);
        p.dy = Math.sin(angle);
        
        // If close to target, stop moving
        if(Math.hypot(targetX - p.x, targetY - p.y) < 20) {
            p.dx = 0;
            p.dy = 0;
        }
    };
    
    const handlePointerDown = (e: PointerEvent) => {
        if (gameState !== 'playing') return;
        isPointerDownRef.current = true;
        handlePointerMove(e); // Start moving immediately
    };

    const handlePointerUp = () => {
        isPointerDownRef.current = false;
        if(playerRef.current) {
            playerRef.current.dx = 0;
            playerRef.current.dy = 0;
        }
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'p') {
          setGameState(g => g === 'playing' ? 'paused' : 'playing');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    if (gameState !== 'loading' && gameState !== 'menu') {
      canvas.addEventListener('pointerdown', handlePointerDown);
      canvas.addEventListener('pointermove', handlePointerMove);
      canvas.addEventListener('pointerup', handlePointerUp);
      canvas.addEventListener('pointerleave', handlePointerUp);
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      
      animationFrameId = requestAnimationFrame(gameLoop);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, isBossFight, score, currentLevel, startLevel, mode, currentDialogue, dialogueIndex, resetGame, showNotification, advanceLevel, isMuted, startGame]);

  const getPowerUpTimer = () => {
      const p = playerRef.current;
      if (!p) return null;

      const multiShotTime = p.powerUps.multiShot?.active ? Math.ceil(p.powerUps.multiShot.duration) : 0;
      const rapidFireTime = p.powerUps.rapidFire?.active ? Math.ceil(p.powerUps.rapidFire.duration) : 0;
      
      const activeTimer = Math.max(multiShotTime, rapidFireTime);

      if (activeTimer > 0) {
        return `Power-Up Time: ${activeTimer}s`;
      }
      return null;
  }

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
      
      {['playing', 'paused'].includes(gameState) && (
        <>
          <div className="pointer-events-none absolute top-0 left-0 w-full p-4 text-white">
            <div className="mx-auto flex max-w-4xl items-center justify-between">
              <div className="w-1/3">
                <p className="text-sm text-muted-foreground">Health</p>
                <Progress value={playerRef.current?.health || 0} className="h-4" />
              </div>
              <div className="text-center">
                <p className="font-headline text-4xl">{score}</p>
                <p className="text-sm text-muted-foreground">{mode === 'story' ? `Level ${currentLevel}` : 'Endless'}</p>
              </div>
              <div className="flex w-1/3 flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  {mode === 'story' && (
                    <div className="text-right">
                      <p className="font-headline text-2xl text-green-400">{curesCollected} / 4</p>
                      <p className="text-sm text-muted-foreground">Cures</p>
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="pointer-events-auto" onClick={() => setGameState(g => g === 'playing' ? 'paused' : 'playing')}>
                    {gameState === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                </div>
                 <div className="text-right pt-2 h-10">
                  {notifications.map(notification => (
                      <p
                        key={notification.id}
                        className={cn(
                          'font-headline text-sm animate-in fade-in slide-in-from-right-8',
                          {
                            'text-green-400': notification.type === 'powerup',
                            'text-red-500': notification.type === 'boss',
                          }
                        )}
                      >
                        {notification.message}
                      </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {playerRef.current?.powerUps && (
            <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 text-white font-bold text-sm">
                {getPowerUpTimer()}
            </div>
          )}
        </>
      )}

      {gameState === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
            <h2 className="font-headline text-5xl mb-8">Loading Assets...</h2>
        </div>
      )}

      {gameState === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
            <h2 className="font-headline text-5xl mb-8">Ready?</h2>
            <Button size="lg" onClick={startGame}>Start Game</Button>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
            <h2 className="font-headline text-5xl mb-8">Paused</h2>
            <div className="flex flex-col gap-4 w-48">
              <Button size="lg" onClick={() => setGameState('playing')}>Resume</Button>
              <Link href="/" passHref>
                <Button size="lg" variant="secondary" className="w-full">
                  <Home className="mr-2 h-5 w-5" />
                  Main Menu
                </Button>
              </Link>
              <Button size="lg" variant="outline" onClick={toggleMute}>
                {isMuted ? <VolumeX className="mr-2 h-5 w-5" /> : <Volume2 className="mr-2 h-5 w-5" />}
                Sound
              </Button>
            </div>
        </div>
      )}
      
      <GameOverDialog
        isOpen={gameState === 'gameOver'}
        score={score}
        onRestart={resetGame}
      />

      {(gameState === 'levelTransition' || gameState === 'storyEnd') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="max-w-2xl text-center p-8">
                <h2 className="font-headline text-4xl text-primary mb-4">{gameState === 'storyEnd' ? 'Mission Complete' : storyLevels[currentLevel - 1]?.title}</h2>
                <p className="text-xl mb-8">{gameState === 'storyEnd' ? "You've secured the package. Now, let's bring it home and save humanity." : currentDialogue[dialogueIndex]}</p>
                 <Button size="lg" onClick={() => {
                  if (gameState === 'storyEnd') {
                    // This will be a Link component, so just let it navigate
                  } else {
                    handleNextDialogue();
                  }
                }}>
                  {gameState === 'storyEnd' ? <Link href="/">Return to Main Menu</Link> : "Continue"}
                </Button>
            </div>
        </div>
      )}
    </div>
  );
};

export default CosmicDrifterGame;
