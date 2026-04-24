import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useLoading } from "../../context/LoadingContext";

export default function PageLoader() {
  const location = useLocation();
  const { isPageLoading, progress } = useLoading();
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(location.pathname + location.search);

  // We still want the loader on normal page transitions (fallback)
  // but it will be overridden/extended by the global `isPageLoading` state if active.
  const [localProgress, setLocalProgress] = useState(0);

  useEffect(() => {
    // If global loading is active, ignore local route changes
    if (isPageLoading) {
      setTimeout(() => setVisible(true), 0);
      return;
    }

    const currentPath = location.pathname + location.search;
    if (prevPath.current === currentPath) return;
    prevPath.current = currentPath;

    const t1 = setTimeout(() => { setVisible(true); setLocalProgress(30); }, 0);
    const t2 = setTimeout(() => setLocalProgress(55), 500);
    const t3 = setTimeout(() => setLocalProgress(75), 1100);
    const t4 = setTimeout(() => setLocalProgress(90), 1700);
    const t5 = setTimeout(() => setLocalProgress(100), 2200);
    const t6 = setTimeout(() => {
      setVisible(false);
      setLocalProgress(0);
    }, 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [location.pathname, location.search, isPageLoading]);

  // When global loading finishes, give it a moment to fade out
  useEffect(() => {
    if (!isPageLoading && progress === 100) {
      const timer = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isPageLoading, progress]);

  if (!visible && !isPageLoading) return null;

  const currentProgress = isPageLoading || progress === 100 ? progress : localProgress;

  return (
    <div
      className="fixed top-0 left-0 h-[2.5px] z-[9999]"
      style={{
        width: `${currentProgress}%`,
        transition: currentProgress === 100
          ? "width 200ms ease-out, opacity 300ms ease-out 100ms"
          : "width 400ms cubic-bezier(0.4, 0, 0.2, 1)",
        background: "linear-gradient(90deg, #dc2626, #ef4444, #f87171)",
        boxShadow: "0 0 12px rgba(220, 38, 38, 0.5), 0 0 4px rgba(220, 38, 38, 0.3)",
        opacity: visible ? 1 : 0,
        pointerEvents: 'none'
      }}
    />
  );
}
