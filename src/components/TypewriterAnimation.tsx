import React, { useState, useEffect } from 'react';

const PHRASES = [
  "BIC transforme les données foncières en outils de décision.",
  "Explorez, comparez, agissez avec clarté et précision."
];

const TypewriterAnimation = () => {

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const currentPhrase = PHRASES[currentPhraseIndex];
    
    if (isTyping) {
      // Typing effect
      if (currentText.length < currentPhrase.length) {
        const timeout = setTimeout(() => {
          setCurrentText(currentPhrase.slice(0, currentText.length + 1));
        }, 50); // Typing speed
        return () => clearTimeout(timeout);
      } else {
        // Pause at the end of typing
        const timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000); // Pause duration
        return () => clearTimeout(timeout);
      }
    } else {
      // Erasing effect
      if (currentText.length > 0) {
        const timeout = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, 30); // Erasing speed
        return () => clearTimeout(timeout);
      } else {
        // Move to next phrase
        const timeout = setTimeout(() => {
          setCurrentPhraseIndex((prev) => (prev + 1) % PHRASES.length);
          setIsTyping(true);
        }, 500); // Pause before next phrase
        return () => clearTimeout(timeout);
      }
    }
  }, [currentText, isTyping, currentPhraseIndex]);

  // Cursor blinking effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="min-h-[3rem] sm:min-h-[3.5rem] md:min-h-[4rem] flex items-center justify-center">
      <p className="text-xs xs:text-sm sm:text-base md:text-lg font-light text-white/95 max-w-xl lg:max-w-2xl mx-auto leading-relaxed">
        {currentText}
        <span 
          className={`inline-block w-0.5 h-4 sm:h-5 md:h-6 bg-white/90 ml-1 ${
            showCursor ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-100`}
        />
      </p>
    </div>
  );
};

export default TypewriterAnimation;