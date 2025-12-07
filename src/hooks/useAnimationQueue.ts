import { useCallback, useRef, useState } from 'react';

interface AnimationItem {
  id: string;
  type: 'deal-card' | 'collect-pot' | 'distribute-win' | 'show-action' | 'flip-card';
  payload: any;
  duration: number;
  delay?: number;
}

interface UseAnimationQueueReturn {
  queue: AnimationItem[];
  isAnimating: boolean;
  addAnimation: (item: Omit<AnimationItem, 'id'>) => void;
  addAnimations: (items: Omit<AnimationItem, 'id'>[]) => void;
  clearQueue: () => void;
  currentAnimation: AnimationItem | null;
}

export const useAnimationQueue = (): UseAnimationQueueReturn => {
  const [queue, setQueue] = useState<AnimationItem[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationItem | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idCounterRef = useRef(0);

  const processNext = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0) {
        setIsAnimating(false);
        setCurrentAnimation(null);
        return prev;
      }

      const [next, ...rest] = prev;
      setCurrentAnimation(next);

      const totalDuration = next.duration + (next.delay || 0);
      
      timeoutRef.current = setTimeout(() => {
        processNext();
      }, totalDuration);

      return rest;
    });
  }, []);

  const addAnimation = useCallback((item: Omit<AnimationItem, 'id'>) => {
    const id = `anim-${++idCounterRef.current}`;
    setQueue(prev => [...prev, { ...item, id }]);
    
    setIsAnimating(current => {
      if (!current) {
        setTimeout(processNext, 0);
        return true;
      }
      return current;
    });
  }, [processNext]);

  const addAnimations = useCallback((items: Omit<AnimationItem, 'id'>[]) => {
    const newItems = items.map(item => ({
      ...item,
      id: `anim-${++idCounterRef.current}`
    }));
    
    setQueue(prev => [...prev, ...newItems]);
    
    setIsAnimating(current => {
      if (!current) {
        setTimeout(processNext, 0);
        return true;
      }
      return current;
    });
  }, [processNext]);

  const clearQueue = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setQueue([]);
    setCurrentAnimation(null);
    setIsAnimating(false);
  }, []);

  return {
    queue,
    isAnimating,
    addAnimation,
    addAnimations,
    clearQueue,
    currentAnimation
  };
};
