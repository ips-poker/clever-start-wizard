// Utility for detecting mobile devices and optimizing performance

let isMobileCache: boolean | null = null;

export function isMobileDevice(): boolean {
  if (isMobileCache !== null) {
    return isMobileCache;
  }
  
  const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const screenWidthCheck = window.innerWidth < 768;
  
  isMobileCache = userAgentCheck || screenWidthCheck;
  
  // Update cache on resize (debounced)
  let resizeTimeout: NodeJS.Timeout;
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      isMobileCache = window.innerWidth < 768;
    }, 250);
  };
  
  window.addEventListener('resize', handleResize, { passive: true });
  
  return isMobileCache;
}

// Check if we should skip heavy visual effects
export function shouldSkipHeavyEffects(): boolean {
  return isMobileDevice();
}

// Check if device has low performance
export function isLowPerformanceDevice(): boolean {
  // Check for low memory devices
  const memory = (navigator as any).deviceMemory;
  if (memory && memory < 4) {
    return true;
  }
  
  // Check for hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency;
  if (cores && cores < 4) {
    return true;
  }
  
  return isMobileDevice();
}
