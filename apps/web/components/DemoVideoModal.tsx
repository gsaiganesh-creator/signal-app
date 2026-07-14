'use client';
import { useEffect, useRef } from 'react';

export function DemoVideoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    videoRef.current?.play().catch(() => {});
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(5,8,16,0.88)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close demo video"
        style={{
          position: 'absolute', top: 24, right: 24, width: 44, height: 44, borderRadius: 12,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
          color: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ✕
      </button>
      <video
        ref={videoRef}
        onClick={e => e.stopPropagation()}
        src="/demo/demo-homepage.mp4"
        controls
        playsInline
        style={{
          maxHeight: '92vh', maxWidth: '92vw', width: 'auto', height: 'auto',
          borderRadius: 20, boxShadow: '0 30px 100px rgba(0,0,0,0.6)',
          aspectRatio: '1290 / 2796',
        }}
      />
    </div>
  );
}
