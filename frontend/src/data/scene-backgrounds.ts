import type { CSSProperties } from 'react'

/**
 * Scene background gradients. Desaturated (Round 2: HSL saturation × 0.63 on top of
 * Round 1's × 0.65, totaling ~× 0.41 of the original illustrative palette) so scene
 * cards visually belong on the dashboard-dark canvas while preserving per-scene
 * color identity. Repeating-overlay alphas were reduced by an additional × 0.70
 * (on top of Round 1's × 0.67) in the same pass.
 */
export const SCENE_BACKGROUNDS: Record<string, CSSProperties> = {
  'garden-of-gethsemane': {
    backgroundColor: '#3c4135',
    backgroundImage: `
      repeating-linear-gradient(
        45deg,
        rgba(255,255,255,0.03) 0px,
        rgba(255,255,255,0.03) 2px,
        transparent 2px,
        transparent 12px
      ),
      repeating-linear-gradient(
        -45deg,
        rgba(255,255,255,0.02) 0px,
        rgba(255,255,255,0.02) 2px,
        transparent 2px,
        transparent 16px
      ),
      linear-gradient(135deg, #2c3125 0%, #484e3e 50%, #3c4135 100%)
    `,
  },
  'still-waters': {
    backgroundColor: '#3d5858',
    backgroundImage: `
      repeating-radial-gradient(
        ellipse 200% 40% at 50% 60%,
        rgba(255,255,255,0.04) 0px,
        transparent 4px,
        transparent 20px,
        rgba(255,255,255,0.02) 22px,
        transparent 24px
      ),
      linear-gradient(180deg, #2d4747 0%, #426262 40%, #527272 100%)
    `,
  },
  'midnight-rain': {
    backgroundColor: '#242a30',
    backgroundImage: `
      repeating-linear-gradient(
        180deg,
        rgba(180,200,220,0.04) 0px,
        rgba(180,200,220,0.04) 1px,
        transparent 1px,
        transparent 8px
      ),
      repeating-linear-gradient(
        175deg,
        rgba(180,200,220,0.02) 0px,
        rgba(180,200,220,0.02) 1px,
        transparent 1px,
        transparent 12px
      ),
      linear-gradient(180deg, #191f25 0%, #242a30 50%, #2f353b 100%)
    `,
  },
  'ember-and-stone': {
    backgroundColor: '#694f3b',
    backgroundImage: `
      radial-gradient(circle 2px at 20% 30%, rgba(255,200,100,0.09) 0%, transparent 100%),
      radial-gradient(circle 3px at 60% 20%, rgba(255,180,80,0.07) 0%, transparent 100%),
      radial-gradient(circle 2px at 80% 60%, rgba(255,220,120,0.08) 0%, transparent 100%),
      radial-gradient(circle 2px at 40% 80%, rgba(255,190,90,0.06) 0%, transparent 100%),
      radial-gradient(circle 3px at 10% 70%, rgba(255,200,100,0.08) 0%, transparent 100%),
      radial-gradient(circle 2px at 90% 40%, rgba(255,210,110,0.06) 0%, transparent 100%),
      linear-gradient(135deg, #593f2b 0%, #795f4b 50%, #694f3b 100%)
    `,
  },
  'morning-mist': {
    backgroundColor: '#757c68',
    backgroundImage: `
      radial-gradient(ellipse 60% 60% at 20% 40%, rgba(255,255,255,0.06) 0%, transparent 70%),
      radial-gradient(ellipse 80% 50% at 70% 30%, rgba(255,255,255,0.04) 0%, transparent 70%),
      radial-gradient(ellipse 50% 70% at 50% 70%, rgba(255,255,255,0.05) 0%, transparent 70%),
      linear-gradient(135deg, #656c58 0%, #858c78 40%, #959a88 100%)
    `,
  },
  'the-upper-room': {
    backgroundColor: '#574a3d',
    backgroundImage: `
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 30px,
        rgba(255,220,160,0.03) 30px,
        rgba(255,220,160,0.03) 32px,
        transparent 32px,
        transparent 60px
      ),
      repeating-radial-gradient(
        ellipse 30% 50% at 50% 100%,
        rgba(255,220,160,0.04) 0px,
        transparent 20px,
        transparent 40px
      ),
      linear-gradient(180deg, #473a2d 0%, #675a4d 50%, #574a3d 100%)
    `,
  },
  starfield: {
    backgroundColor: '#221e32',
    backgroundImage: `
      radial-gradient(circle 1px at 15% 20%, rgba(255,255,255,0.19) 0%, transparent 100%),
      radial-gradient(circle 1px at 45% 10%, rgba(255,255,255,0.14) 0%, transparent 100%),
      radial-gradient(circle 2px at 75% 35%, rgba(255,255,255,0.16) 0%, transparent 100%),
      radial-gradient(circle 1px at 25% 55%, rgba(255,255,255,0.12) 0%, transparent 100%),
      radial-gradient(circle 1px at 85% 65%, rgba(255,255,255,0.14) 0%, transparent 100%),
      radial-gradient(circle 2px at 55% 80%, rgba(255,255,255,0.16) 0%, transparent 100%),
      radial-gradient(circle 1px at 35% 90%, rgba(255,255,255,0.09) 0%, transparent 100%),
      radial-gradient(circle 1px at 65% 50%, rgba(255,255,255,0.14) 0%, transparent 100%),
      radial-gradient(circle 1px at 5% 75%, rgba(255,255,255,0.12) 0%, transparent 100%),
      radial-gradient(circle 1px at 95% 15%, rgba(255,255,255,0.14) 0%, transparent 100%),
      linear-gradient(135deg, #171424 0%, #27233d 50%, #363055 100%)
    `,
  },
  'mountain-refuge': {
    backgroundColor: '#5c5548',
    backgroundImage: `
      linear-gradient(
        165deg,
        transparent 40%,
        rgba(80,60,30,0.07) 40%,
        rgba(80,60,30,0.07) 42%,
        transparent 42%
      ),
      linear-gradient(
        195deg,
        transparent 50%,
        rgba(60,45,20,0.06) 50%,
        rgba(60,45,20,0.06) 53%,
        transparent 53%
      ),
      linear-gradient(
        175deg,
        transparent 35%,
        rgba(90,70,40,0.05) 35%,
        rgba(90,70,40,0.05) 38%,
        transparent 38%
      ),
      linear-gradient(135deg, #4c4538 0%, #6c6558 40%, #7c7568 100%)
    `,
  },
  'peaceful-study': {
    backgroundColor: '#3d5057',
    backgroundImage: `
      repeating-radial-gradient(
        ellipse 150% 60% at 50% 80%,
        rgba(255,255,255,0.03) 0px,
        transparent 3px,
        transparent 18px,
        rgba(255,255,255,0.02) 20px,
        transparent 22px
      ),
      radial-gradient(ellipse 70% 50% at 30% 40%, rgba(200,230,240,0.04) 0%, transparent 70%),
      linear-gradient(180deg, #2d4047 0%, #425c62 40%, #526c72 100%)
    `,
  },
  'evening-scripture': {
    backgroundColor: '#5e4a36',
    backgroundImage: `
      radial-gradient(circle 3px at 25% 35%, rgba(255,200,100,0.08) 0%, transparent 100%),
      radial-gradient(circle 2px at 65% 25%, rgba(255,180,80,0.06) 0%, transparent 100%),
      radial-gradient(circle 3px at 85% 55%, rgba(255,210,120,0.08) 0%, transparent 100%),
      radial-gradient(circle 2px at 15% 75%, rgba(255,190,90,0.06) 0%, transparent 100%),
      radial-gradient(circle 2px at 50% 65%, rgba(255,200,100,0.05) 0%, transparent 100%),
      linear-gradient(135deg, #443326 0%, #6e5a46 50%, #5e4a36 100%)
    `,
  },
  'sacred-space': {
    backgroundColor: '#2f283c',
    backgroundImage: `
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 40px,
        rgba(200,180,240,0.02) 40px,
        rgba(200,180,240,0.02) 42px,
        transparent 42px,
        transparent 80px
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 50px,
        rgba(200,180,240,0.01) 50px,
        rgba(200,180,240,0.01) 52px,
        transparent 52px,
        transparent 100px
      ),
      linear-gradient(180deg, #221e32 0%, #342d47 50%, #443d57 100%)
    `,
  },
}

export function getSceneBackground(sceneId: string): CSSProperties | undefined {
  return SCENE_BACKGROUNDS[sceneId]
}
