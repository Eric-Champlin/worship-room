import type { CSSProperties } from 'react'

/**
 * Scene background gradients. Desaturated ~35% from the pre-Music-facelift
 * palette (HSL saturation × 0.65) so scene cards visually belong on the
 * dashboard-dark canvas while preserving per-scene color identity. Repeating
 * overlay alphas were reduced by ~33% (× 0.67) in the same pass.
 */
export const SCENE_BACKGROUNDS: Record<string, CSSProperties> = {
  'garden-of-gethsemane': {
    backgroundColor: '#3c4531',
    backgroundImage: `
      repeating-linear-gradient(
        45deg,
        rgba(255,255,255,0.04) 0px,
        rgba(255,255,255,0.04) 2px,
        transparent 2px,
        transparent 12px
      ),
      repeating-linear-gradient(
        -45deg,
        rgba(255,255,255,0.03) 0px,
        rgba(255,255,255,0.03) 2px,
        transparent 2px,
        transparent 16px
      ),
      linear-gradient(135deg, #2c3521 0%, #495339 50%, #3c4531 100%)
    `,
  },
  'still-waters': {
    backgroundColor: '#356060',
    backgroundImage: `
      repeating-radial-gradient(
        ellipse 200% 40% at 50% 60%,
        rgba(255,255,255,0.05) 0px,
        transparent 4px,
        transparent 20px,
        rgba(255,255,255,0.03) 22px,
        transparent 24px
      ),
      linear-gradient(180deg, #254f4f 0%, #386c6c 40%, #487c7c 100%)
    `,
  },
  'midnight-rain': {
    backgroundColor: '#202a34',
    backgroundImage: `
      repeating-linear-gradient(
        180deg,
        rgba(180,200,220,0.05) 0px,
        rgba(180,200,220,0.05) 1px,
        transparent 1px,
        transparent 8px
      ),
      repeating-linear-gradient(
        175deg,
        rgba(180,200,220,0.03) 0px,
        rgba(180,200,220,0.03) 1px,
        transparent 1px,
        transparent 12px
      ),
      linear-gradient(180deg, #151f29 0%, #202a34 50%, #2b353f 100%)
    `,
  },
  'ember-and-stone': {
    backgroundColor: '#764d2e',
    backgroundImage: `
      radial-gradient(circle 2px at 20% 30%, rgba(255,200,100,0.13) 0%, transparent 100%),
      radial-gradient(circle 3px at 60% 20%, rgba(255,180,80,0.10) 0%, transparent 100%),
      radial-gradient(circle 2px at 80% 60%, rgba(255,220,120,0.12) 0%, transparent 100%),
      radial-gradient(circle 2px at 40% 80%, rgba(255,190,90,0.08) 0%, transparent 100%),
      radial-gradient(circle 3px at 10% 70%, rgba(255,200,100,0.11) 0%, transparent 100%),
      radial-gradient(circle 2px at 90% 40%, rgba(255,210,110,0.09) 0%, transparent 100%),
      linear-gradient(135deg, #663d1e 0%, #865d3e 50%, #764d2e 100%)
    `,
  },
  'morning-mist': {
    backgroundColor: '#778262',
    backgroundImage: `
      radial-gradient(ellipse 60% 60% at 20% 40%, rgba(255,255,255,0.08) 0%, transparent 70%),
      radial-gradient(ellipse 80% 50% at 70% 30%, rgba(255,255,255,0.05) 0%, transparent 70%),
      radial-gradient(ellipse 50% 70% at 50% 70%, rgba(255,255,255,0.07) 0%, transparent 70%),
      linear-gradient(135deg, #677252 0%, #879272 40%, #97a082 100%)
    `,
  },
  'the-upper-room': {
    backgroundColor: '#5f4a35',
    backgroundImage: `
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 30px,
        rgba(255,220,160,0.04) 30px,
        rgba(255,220,160,0.04) 32px,
        transparent 32px,
        transparent 60px
      ),
      repeating-radial-gradient(
        ellipse 30% 50% at 50% 100%,
        rgba(255,220,160,0.05) 0px,
        transparent 20px,
        transparent 40px
      ),
      linear-gradient(180deg, #4f3a25 0%, #6f5a45 50%, #5f4a35 100%)
    `,
  },
  starfield: {
    backgroundColor: '#1f1838',
    backgroundImage: `
      radial-gradient(circle 1px at 15% 20%, rgba(255,255,255,0.27) 0%, transparent 100%),
      radial-gradient(circle 1px at 45% 10%, rgba(255,255,255,0.20) 0%, transparent 100%),
      radial-gradient(circle 2px at 75% 35%, rgba(255,255,255,0.23) 0%, transparent 100%),
      radial-gradient(circle 1px at 25% 55%, rgba(255,255,255,0.17) 0%, transparent 100%),
      radial-gradient(circle 1px at 85% 65%, rgba(255,255,255,0.20) 0%, transparent 100%),
      radial-gradient(circle 2px at 55% 80%, rgba(255,255,255,0.23) 0%, transparent 100%),
      radial-gradient(circle 1px at 35% 90%, rgba(255,255,255,0.13) 0%, transparent 100%),
      radial-gradient(circle 1px at 65% 50%, rgba(255,255,255,0.20) 0%, transparent 100%),
      radial-gradient(circle 1px at 5% 75%, rgba(255,255,255,0.17) 0%, transparent 100%),
      radial-gradient(circle 1px at 95% 15%, rgba(255,255,255,0.20) 0%, transparent 100%),
      linear-gradient(135deg, #140f29 0%, #221b45 50%, #2f2560 100%)
    `,
  },
  'mountain-refuge': {
    backgroundColor: '#625742',
    backgroundImage: `
      linear-gradient(
        165deg,
        transparent 40%,
        rgba(80,60,30,0.10) 40%,
        rgba(80,60,30,0.10) 42%,
        transparent 42%
      ),
      linear-gradient(
        195deg,
        transparent 50%,
        rgba(60,45,20,0.08) 50%,
        rgba(60,45,20,0.08) 53%,
        transparent 53%
      ),
      linear-gradient(
        175deg,
        transparent 35%,
        rgba(90,70,40,0.07) 35%,
        rgba(90,70,40,0.07) 38%,
        transparent 38%
      ),
      linear-gradient(135deg, #524732 0%, #726752 40%, #827762 100%)
    `,
  },
  'peaceful-study': {
    backgroundColor: '#35545f',
    backgroundImage: `
      repeating-radial-gradient(
        ellipse 150% 60% at 50% 80%,
        rgba(255,255,255,0.04) 0px,
        transparent 3px,
        transparent 18px,
        rgba(255,255,255,0.03) 20px,
        transparent 22px
      ),
      radial-gradient(ellipse 70% 50% at 30% 40%, rgba(200,230,240,0.05) 0%, transparent 70%),
      linear-gradient(180deg, #25444f 0%, #38626c 40%, #48727c 100%)
    `,
  },
  'evening-scripture': {
    backgroundColor: '#694a2b',
    backgroundImage: `
      radial-gradient(circle 3px at 25% 35%, rgba(255,200,100,0.12) 0%, transparent 100%),
      radial-gradient(circle 2px at 65% 25%, rgba(255,180,80,0.09) 0%, transparent 100%),
      radial-gradient(circle 3px at 85% 55%, rgba(255,210,120,0.11) 0%, transparent 100%),
      radial-gradient(circle 2px at 15% 75%, rgba(255,190,90,0.08) 0%, transparent 100%),
      radial-gradient(circle 2px at 50% 65%, rgba(255,200,100,0.07) 0%, transparent 100%),
      linear-gradient(135deg, #4d321d 0%, #795a3b 50%, #694a2b 100%)
    `,
  },
  'sacred-space': {
    backgroundColor: '#2d2242',
    backgroundImage: `
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 40px,
        rgba(200,180,240,0.03) 40px,
        rgba(200,180,240,0.03) 42px,
        transparent 42px,
        transparent 80px
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 50px,
        rgba(200,180,240,0.02) 50px,
        rgba(200,180,240,0.02) 52px,
        transparent 52px,
        transparent 100px
      ),
      linear-gradient(180deg, #1f1838 0%, #30254f 50%, #40355f 100%)
    `,
  },
}

export function getSceneBackground(sceneId: string): CSSProperties | undefined {
  return SCENE_BACKGROUNDS[sceneId]
}
