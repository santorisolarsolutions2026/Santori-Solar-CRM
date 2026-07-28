'use client';

import React, { useState, useEffect } from 'react';

export default function Typewriter({ texts }: { texts: string[] }) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(150);

  const textsRef = React.useRef(texts);
  useEffect(() => {
    textsRef.current = texts;
  }, [texts]);

  useEffect(() => {
    const list = textsRef.current;
    if (!list || list.length === 0) return;
    const fullText = list[currentTextIndex % list.length];
    
    const handleTyping = () => {
      if (!isDeleting) {
        // Typing text
        setCurrentText(fullText.substring(0, currentText.length + 1));
        setTypingSpeed(100);

        if (currentText === fullText) {
          // Pause before starting deletion
          setTypingSpeed(2000);
          setIsDeleting(true);
        }
      } else {
        // Deleting text
        setCurrentText(fullText.substring(0, currentText.length - 1));
        setTypingSpeed(50);

        if (currentText === '') {
          setIsDeleting(false);
          setCurrentTextIndex((prev) => (prev + 1) % list.length);
          setTypingSpeed(500); // Pause before typing the next word
        }
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentTextIndex, typingSpeed]);

  return (
    <span className="relative inline-block whitespace-nowrap">
      <span className="text-blue-500 dark:text-blue-400 font-extrabold">
        {currentText || "\u00A0"}
      </span>
      <span className="absolute -right-2 top-0 bottom-0 w-0.5 bg-blue-500 dark:bg-blue-400 animate-pulse" />
    </span>
  );
}
