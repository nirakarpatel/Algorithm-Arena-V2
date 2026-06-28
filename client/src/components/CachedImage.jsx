import React, { useState, useEffect } from 'react';

// Global memory cache to track successfully preloaded image sources
const globalImageCache = new Map();

const CachedImage = ({ src, alt = '', className = '', ...props }) => {
  const [prevSrc, setPrevSrc] = useState(src);
  const [currentSrc, setCurrentSrc] = useState(() => {
    if (!src) return '';
    return globalImageCache.get(src) || src;
  });

  // Adjust state during render if the src prop has changed (React recommended pattern)
  if (src !== prevSrc) {
    setPrevSrc(src);
    setCurrentSrc(!src ? '' : (globalImageCache.get(src) || src));
  }

  useEffect(() => {
    if (!src) return;

    // If already preloaded and cached, do nothing (state is already correct)
    if (globalImageCache.has(src)) {
      return;
    }

    let isMounted = true;
    const img = new Image();
    
    // Support cross-origin images where possible
    if (!src.startsWith('data:')) {
      img.referrerPolicy = 'no-referrer';
    }
    
    img.src = src;
    img.onload = () => {
      globalImageCache.set(src, src);
      if (isMounted) {
        setCurrentSrc(src);
      }
    };
    img.onerror = () => {
      // Fallback to the original URL if preloading fails
      if (isMounted) {
        setCurrentSrc(src);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [src]);

  // Render a placeholder or skeleton if not yet loaded and src is remote, or render the image
  return (
    <img
      src={currentSrc || 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22100%22 height%3D%22100%22 viewBox%3D%220 0 100 100%22%3E%3Crect width%3D%22100%22 height%3D%22100%22 fill%3D%22rgba(255%252C255%252C255%252C0.03)%22%2F%3E%3C%2Fsvg%3E'}
      alt={alt}
      className={`${className} transition-opacity duration-300 ${currentSrc ? 'opacity-100' : 'opacity-40'}`}
      {...props}
    />
  );
};

export default CachedImage;
