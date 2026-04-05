'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onComplete: () => void;
}

const WORDS = ['PhysIQ', 'Vật Lý 10', 'Mixi'];

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [wordIndex, setWordIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setWordIndex((prev) => {
        if (prev < WORDS.length - 1) {
          return prev + 1;
        }
        clearInterval(wordInterval);
        return prev;
      });
    }, 900);

    const startTime = Date.now();
    const duration = 2700;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          onCompleteRef.current();
        }, 400);
      }
    };

    requestAnimationFrame(animate);

    return () => {
      clearInterval(wordInterval);
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: '#0a0a0a' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.div
        className="absolute top-8 left-8 md:top-12 md:left-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <span 
          className="text-xs md:text-sm uppercase tracking-[0.3em]"
          style={{ color: '#888888' }}
        >
          PhysIQ
        </span>
      </motion.div>

      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={wordIndex}
            className="text-4xl md:text-6xl lg:text-7xl italic"
            style={{ color: 'rgba(245, 245, 245, 0.8)', fontFamily: 'Instrument Serif, serif' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            {WORDS[wordIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      <motion.div
        className="absolute bottom-8 right-8 md:bottom-12 md:right-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <span 
          className="text-6xl md:text-8xl lg:text-9xl tabular-nums"
          style={{ color: '#f5f5f5', fontFamily: 'Instrument Serif, serif' }}
        >
          {Math.round(progress).toString().padStart(3, '0')}
        </span>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: 'rgba(31, 31, 31, 0.5)' }}>
        <motion.div
          className="h-full origin-left"
          style={{
            scaleX: progress / 100,
            background: 'linear-gradient(90deg, #89AACC 0%, #4E85BF 100%)',
            boxShadow: '0 0 8px rgba(137, 170, 204, 0.35)',
          }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}
