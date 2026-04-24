import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const LoadingContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useLoading() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }) {
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const crawlRef = useRef(null);

  useEffect(() => {
    if (isPageLoading) {
      // Start loading
      setTimeout(() => setProgress(10), 0);
      crawlRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(crawlRef.current);
            return 85; // cap at 85% until done
          }
          return prev + (85 - prev) * 0.1; // Ease toward 85
        });
      }, 500);
    } else {
      // Loading done
      if (crawlRef.current) clearInterval(crawlRef.current);
      
      // We use setTimeout 0 here to prevent synchronous setState inside another component's useEffect
      setTimeout(() => setProgress(100), 0);

      const hideTimer = setTimeout(() => {
        setProgress(0);
      }, 800); // Wait for transition and PageLoader fade out

      return () => clearTimeout(hideTimer);
    }

    return () => {
      if (crawlRef.current) clearInterval(crawlRef.current);
    };
  }, [isPageLoading]);

  return (
    <LoadingContext.Provider value={{ isPageLoading, setPageLoading: setIsPageLoading, progress }}>
      {children}
    </LoadingContext.Provider>
  );
}
