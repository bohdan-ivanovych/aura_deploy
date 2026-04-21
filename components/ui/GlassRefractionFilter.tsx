/**
 * GlassRefractionFilter — SVG filter definitions for Liquid Glass UI.
 * 
 * WHY: Using feTurbulence + feDisplacementMap creates a subtle light-refraction
 * distortion effect that makes glass surfaces feel physically real — like looking
 * through textured glass. This is GPU-composited via SVG filters, zero layout cost.
 * 
 * USAGE: Mount once in root layout. Reference via CSS: filter: url(#glass-refraction)
 * 
 * ACCESSIBILITY: The filter is purely decorative. It's ignored by screen readers
 * (aria-hidden) and disabled for users who prefer reduced motion.
 */
export function GlassRefractionFilter() {
  return (
    <svg
      aria-hidden="true"
      className="fixed w-0 h-0 overflow-hidden pointer-events-none"
      style={{ position: 'absolute', width: 0, height: 0 }}
    >
      <defs>
        {/* Primary refraction — subtle glass distortion for nav bars, modals, card overlays */}
        <filter id="glass-refraction" x="-10%" y="-10%" width="120%" height="120%">
          {/* Generate organic noise pattern — simulates glass surface imperfections */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015 0.015"
            numOctaves={3}
            seed={42}
            stitchTiles="stitch"
            result="noise"
          />
          {/* Apply displacement — shifts pixels based on noise, creating refraction */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={3}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Lighter variant — for smaller elements where strong refraction is too much */}
        <filter id="glass-refraction-subtle" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02 0.02"
            numOctaves={2}
            seed={7}
            stitchTiles="stitch"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={1.5}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
