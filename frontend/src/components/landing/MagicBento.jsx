import { useRef, useState, useCallback, useEffect } from 'react';

/* ─── Defaults ────────────────────────────────────────────── */
const DEFAULTS = {
  glowColor: '34, 197, 94',      // medical green
  spotlightRadius: 350,
  particleCount: 10,
  tiltMax: 6,                     // degrees
};

/* ─── Star particle ───────────────────────────────────────── */
function Star({ color, containerRect }) {
  const [style, setStyle] = useState(null);
  useEffect(() => {
    if (!containerRect) return;
    const size = 2 + Math.random() * 3;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const dur = 2 + Math.random() * 3;
    const delay = Math.random() * 3;
    setStyle({
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: `rgba(${color}, 0.6)`,
      boxShadow: `0 0 ${size * 2}px rgba(${color}, 0.4)`,
      pointerEvents: 'none',
      animation: `magicStarPulse ${dur}s ${delay}s ease-in-out infinite`,
      zIndex: 1,
    });
  }, [color, containerRect]);
  if (!style) return null;
  return <div style={style} />;
}

/* ─── Click ripple ────────────────────────────────────────── */
function Ripple({ x, y, color, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 20,
        top: y - 20,
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${color}, 0.5), transparent 70%)`,
        animation: 'magicRipple 0.6s ease-out forwards',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}

/* ─── Main MagicBento wrapper ─────────────────────────────── */
export default function MagicBento({
  children,
  glowColor = DEFAULTS.glowColor,
  spotlightRadius = DEFAULTS.spotlightRadius,
  particleCount = DEFAULTS.particleCount,
  tiltMax = DEFAULTS.tiltMax,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  enableTilt = true,
  clickEffect = true,
  style: externalStyle = {},
  className = '',
}) {
  const ref = useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0, inside: false });
  const [ripples, setRipples] = useState([]);
  const [rect, setRect] = useState(null);

  /* Track size for stars */
  useEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setRect(r);
  }, []);

  /* Mouse handlers */
  const onMove = useCallback((e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setMouse({ x: e.clientX - r.left, y: e.clientY - r.top, inside: true });
  }, []);

  const onLeave = useCallback(() => {
    setMouse((m) => ({ ...m, inside: false }));
  }, []);

  const onClick = useCallback(
    (e) => {
      if (!clickEffect || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const id = Date.now();
      setRipples((prev) => [...prev, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    },
    [clickEffect]
  );

  /* Tilt + pop-up transform */
  const tiltStyle = enableTilt && mouse.inside && ref.current
    ? (() => {
        const r = ref.current.getBoundingClientRect();
        const cx = r.width / 2;
        const cy = r.height / 2;
        const rotY = ((mouse.x - cx) / cx) * tiltMax;
        const rotX = -((mouse.y - cy) / cy) * tiltMax;
        return {
          transform: `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.04, 1.04, 1.04)`,
        };
      })()
    : { transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)' };

  /* Spotlight gradient */
  const spotlightBg =
    enableSpotlight && mouse.inside
      ? `radial-gradient(${spotlightRadius}px circle at ${mouse.x}px ${mouse.y}px, rgba(${glowColor}, 0.10), transparent 60%)`
      : 'none';

  /* Border glow + elevated shadow on hover */
  const borderGlow =
    enableBorderGlow && mouse.inside
      ? `0 0 0 1px rgba(${glowColor}, 0.35), 0 0 25px rgba(${glowColor}, 0.15), 0 20px 60px rgba(0,0,0,0.25), inset 0 0 30px rgba(${glowColor}, 0.04)`
      : '0 0 0 1px var(--border-subtle), 0 2px 8px rgba(0,0,0,0.06)';

  return (
    <div
      ref={ref}
      className={`magic-bento ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '1.25rem',
        background: 'var(--bg-card)',
        border: '1px solid transparent',
        boxShadow: borderGlow,
        willChange: 'transform, box-shadow',
        cursor: 'pointer',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease',
        ...tiltStyle,
        ...externalStyle,
      }}
    >
      {/* Spotlight overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          backgroundImage: spotlightBg,
          pointerEvents: 'none',
          zIndex: 2,
          transition: 'background-image 0.15s ease',
        }}
      />

      {/* Stars */}
      {enableStars &&
        Array.from({ length: particleCount }).map((_, i) => (
          <Star key={i} color={glowColor} containerRect={rect} />
        ))}

      {/* Ripples */}
      {ripples.map((r) => (
        <Ripple
          key={r.id}
          x={r.x}
          y={r.y}
          color={glowColor}
          onDone={() => setRipples((prev) => prev.filter((p) => p.id !== r.id))}
        />
      ))}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 3 }}>{children}</div>
    </div>
  );
}
