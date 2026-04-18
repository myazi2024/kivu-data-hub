import React, { useState, useEffect, useMemo } from 'react';
import { useAppAppearance } from '@/hooks/useAppAppearance';

const FALLBACK_PHRASES = [
  "BIC transforme les données foncières en outils de décision.",
  "Explorez, comparez, agissez avec clarté et précision."
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const TypewriterAnimation = () => {
  const { config } = useAppAppearance();
  const phrases = useMemo<string[]>(() => {
    const fromConfig = config.hero_phrases;
    if (Array.isArray(fromConfig) && fromConfig.length > 0) return fromConfig;
    return FALLBACK_PHRASES;
  }, [config.hero_phrases]);

  const [reduced, setReduced] = useState<boolean>(() => prefersReducedMotion());
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mq.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Reduced motion: just rotate phrases statically
  useEffect(() => {
    if (!reduced) return;
    setCurrentText(phrases[currentPhraseIndex]);
    const id = setTimeout(() => {
      setCurrentPhraseIndex((p) => (p + 1) % phrases.length);
    }, 5000);
    return () => clearTimeout(id);
  }, [reduced, currentPhraseIndex, phrases]);

  useEffect(() => {
    if (reduced) return;
    const currentPhrase = phrases[currentPhraseIndex] ?? '';
    if (isTyping) {
      if (currentText.length < currentPhrase.length) {
        const t = setTimeout(() => setCurrentText(currentPhrase.slice(0, currentText.length + 1)), 50);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setIsTyping(false), 2000);
      return () => clearTimeout(t);
    } else {
      if (currentText.length > 0) {
        const t = setTimeout(() => setCurrentText(currentText.slice(0, -1)), 30);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
        setIsTyping(true);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [currentText, isTyping, currentPhraseIndex, phrases, reduced]);

  useEffect(() => {
    if (reduced) {
      setShowCursor(false);
      return;
    }
    const i = setInterval(() => setShowCursor((p) => !p), 500);
    return () => clearInterval(i);
  }, [reduced]);

  return (
    <div
      className="min-h-[3.5rem] sm:min-h-[4rem] md:min-h-[4.5rem] flex items-center justify-center"
      aria-live="polite"
    >
      <p className="text-xs xs:text-sm sm:text-base md:text-lg font-light text-white/95 max-w-xl lg:max-w-2xl mx-auto leading-relaxed px-2">
        {currentText}
        {!reduced && (
          <span
            aria-hidden="true"
            className={`inline-block w-0.5 h-4 sm:h-5 md:h-6 bg-white/90 ml-1 align-middle ${
              showCursor ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-100`}
          />
        )}
      </p>
    </div>
  );
};

export default TypewriterAnimation;
