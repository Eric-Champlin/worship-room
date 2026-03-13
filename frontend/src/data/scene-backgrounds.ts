import type { CSSProperties } from 'react'

export const SCENE_BACKGROUNDS: Record<string, CSSProperties> = {
  'garden-of-gethsemane': {
    backgroundColor: '#3d4a2c',
    backgroundImage: `
      repeating-linear-gradient(
        45deg,
        rgba(255,255,255,0.06) 0px,
        rgba(255,255,255,0.06) 2px,
        transparent 2px,
        transparent 12px
      ),
      repeating-linear-gradient(
        -45deg,
        rgba(255,255,255,0.04) 0px,
        rgba(255,255,255,0.04) 2px,
        transparent 2px,
        transparent 16px
      ),
      linear-gradient(135deg, #2d3a1c 0%, #4a5a32 50%, #3d4a2c 100%)
    `,
  },
  'still-waters': {
    backgroundColor: '#2a6b6b',
    backgroundImage: `
      repeating-radial-gradient(
        ellipse 200% 40% at 50% 60%,
        rgba(255,255,255,0.08) 0px,
        transparent 4px,
        transparent 20px,
        rgba(255,255,255,0.05) 22px,
        transparent 24px
      ),
      linear-gradient(180deg, #1a5a5a 0%, #2a7a7a 40%, #3a8a8a 100%)
    `,
  },
  'midnight-rain': {
    backgroundColor: '#1a2a3a',
    backgroundImage: `
      repeating-linear-gradient(
        180deg,
        rgba(180,200,220,0.08) 0px,
        rgba(180,200,220,0.08) 1px,
        transparent 1px,
        transparent 8px
      ),
      repeating-linear-gradient(
        175deg,
        rgba(180,200,220,0.05) 0px,
        rgba(180,200,220,0.05) 1px,
        transparent 1px,
        transparent 12px
      ),
      linear-gradient(180deg, #0f1f2f 0%, #1a2a3a 50%, #253545 100%)
    `,
  },
  'ember-and-stone': {
    backgroundColor: '#8a4a1a',
    backgroundImage: `
      radial-gradient(circle 2px at 20% 30%, rgba(255,200,100,0.2) 0%, transparent 100%),
      radial-gradient(circle 3px at 60% 20%, rgba(255,180,80,0.15) 0%, transparent 100%),
      radial-gradient(circle 2px at 80% 60%, rgba(255,220,120,0.18) 0%, transparent 100%),
      radial-gradient(circle 2px at 40% 80%, rgba(255,190,90,0.12) 0%, transparent 100%),
      radial-gradient(circle 3px at 10% 70%, rgba(255,200,100,0.16) 0%, transparent 100%),
      radial-gradient(circle 2px at 90% 40%, rgba(255,210,110,0.14) 0%, transparent 100%),
      linear-gradient(135deg, #7a3a0a 0%, #9a5a2a 50%, #8a4a1a 100%)
    `,
  },
  'morning-mist': {
    backgroundColor: '#7a8a5a',
    backgroundImage: `
      radial-gradient(ellipse 60% 60% at 20% 40%, rgba(255,255,255,0.12) 0%, transparent 70%),
      radial-gradient(ellipse 80% 50% at 70% 30%, rgba(255,255,255,0.08) 0%, transparent 70%),
      radial-gradient(ellipse 50% 70% at 50% 70%, rgba(255,255,255,0.1) 0%, transparent 70%),
      linear-gradient(135deg, #6a7a4a 0%, #8a9a6a 40%, #9aa87a 100%)
    `,
  },
  'the-upper-room': {
    backgroundColor: '#6a4a2a',
    backgroundImage: `
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 30px,
        rgba(255,220,160,0.06) 30px,
        rgba(255,220,160,0.06) 32px,
        transparent 32px,
        transparent 60px
      ),
      repeating-radial-gradient(
        ellipse 30% 50% at 50% 100%,
        rgba(255,220,160,0.08) 0px,
        transparent 20px,
        transparent 40px
      ),
      linear-gradient(180deg, #5a3a1a 0%, #7a5a3a 50%, #6a4a2a 100%)
    `,
  },
  starfield: {
    backgroundColor: '#1a1040',
    backgroundImage: `
      radial-gradient(circle 1px at 15% 20%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(circle 1px at 45% 10%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(circle 2px at 75% 35%, rgba(255,255,255,0.35) 0%, transparent 100%),
      radial-gradient(circle 1px at 25% 55%, rgba(255,255,255,0.25) 0%, transparent 100%),
      radial-gradient(circle 1px at 85% 65%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(circle 2px at 55% 80%, rgba(255,255,255,0.35) 0%, transparent 100%),
      radial-gradient(circle 1px at 35% 90%, rgba(255,255,255,0.2) 0%, transparent 100%),
      radial-gradient(circle 1px at 65% 50%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(circle 1px at 5% 75%, rgba(255,255,255,0.25) 0%, transparent 100%),
      radial-gradient(circle 1px at 95% 15%, rgba(255,255,255,0.3) 0%, transparent 100%),
      linear-gradient(135deg, #0f0830 0%, #1a1050 50%, #251570 100%)
    `,
  },
  'mountain-refuge': {
    backgroundColor: '#6a5a3a',
    backgroundImage: `
      linear-gradient(
        165deg,
        transparent 40%,
        rgba(80,60,30,0.15) 40%,
        rgba(80,60,30,0.15) 42%,
        transparent 42%
      ),
      linear-gradient(
        195deg,
        transparent 50%,
        rgba(60,45,20,0.12) 50%,
        rgba(60,45,20,0.12) 53%,
        transparent 53%
      ),
      linear-gradient(
        175deg,
        transparent 35%,
        rgba(90,70,40,0.1) 35%,
        rgba(90,70,40,0.1) 38%,
        transparent 38%
      ),
      linear-gradient(135deg, #5a4a2a 0%, #7a6a4a 40%, #8a7a5a 100%)
    `,
  },
}

export function getSceneBackground(sceneId: string): CSSProperties | undefined {
  return SCENE_BACKGROUNDS[sceneId]
}
