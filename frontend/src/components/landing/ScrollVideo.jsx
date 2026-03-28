import { useRef, useEffect, useCallback } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';
import useIsMobile from '../../hooks/useIsMobile';

const FRAME_COUNT = 177;

function getFrameSrc(index) {
  const num = Math.min(Math.max(Math.round(index), 1), FRAME_COUNT);
  return `/sequence/frame_${String(num).padStart(4, '0')}.png`;
}

export default function ScrollVideo() {
  const isMobile = useIsMobile();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imagesRef = useRef([]);
  const currentFrameRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const frameIndex = useTransform(scrollYProgress, [0, 1], [1, FRAME_COUNT]);

  // Preload images
  useEffect(() => {
    const imgs = [];
    let loadedCount = 0;
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.src = getFrameSrc(i);
      img.onload = () => {
        loadedCount++;
        if (loadedCount === 1) {
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
          }
        }
      };
      imgs[i] = img;
    }
    imagesRef.current = imgs;
  }, []);

  const rafIdRef = useRef(null);
  const pendingFrameRef = useRef(null);
  const canvasSizedRef = useRef(false);

  // Render frame on scroll — batched with rAF to avoid jank
  const renderFrame = useCallback((index) => {
    const roundedIndex = Math.min(Math.max(Math.round(index), 1), FRAME_COUNT);
    if (roundedIndex === currentFrameRef.current) return;
    pendingFrameRef.current = roundedIndex;

    if (rafIdRef.current) return; // already scheduled
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const frame = pendingFrameRef.current;
      if (frame === null) return;
      currentFrameRef.current = frame;

      const canvas = canvasRef.current;
      const img = imagesRef.current[frame];
      if (!canvas || !img || !img.complete) return;

      // Only set dimensions once
      if (!canvasSizedRef.current) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvasSizedRef.current = true;
      }
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = frameIndex.on('change', renderFrame);
    return () => unsubscribe();
  }, [frameIndex, renderFrame]);

  return (
    <div ref={containerRef} style={{ height: isMobile ? '300vh' : '500vh', position: 'relative' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
        {/* Overlay gradient for transition */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '30%',
            background: 'linear-gradient(to top, var(--bg-primary), transparent)',
            opacity: useTransform(scrollYProgress, [0.7, 1], [0, 1]),
          }}
        />

        {/* Clickable "Get Started" overlay — appears when the button is visible in the frames */}
        <motion.div
          onClick={() => {
            const target = document.getElementById('expanding-cta');
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '18%',
            transform: 'translateX(-50%)',
            width: isMobile ? '200px' : '300px',
            height: isMobile ? '55px' : '70px',
            cursor: 'pointer',
            zIndex: 10,
            borderRadius: '12px',
            opacity: useTransform(scrollYProgress, [0.55, 0.68, 0.88, 0.95], [0, 1, 1, 0]),
            pointerEvents: 'auto',
          }}
          whileHover={{
            boxShadow: '0 0 30px rgba(255, 180, 50, 0.4)',
          }}
        />

      </div>
    </div>
  );
}
