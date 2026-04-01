import { useState, useRef, useCallback } from 'react';

interface UseRovingTabindexOptions {
  itemCount: number;
  onSelect: (index: number) => void;
  orientation?: 'horizontal' | 'vertical' | 'both';
  initialIndex?: number;
}

interface UseRovingTabindexReturn {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  getItemProps: (index: number) => {
    tabIndex: number;
    onKeyDown: (e: React.KeyboardEvent) => void;
    ref: (el: HTMLElement | null) => void;
  };
}

export function useRovingTabindex({
  itemCount,
  onSelect,
  orientation = 'horizontal',
  initialIndex = 0,
}: UseRovingTabindexOptions): UseRovingTabindexReturn {
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const len = itemCount;
      let newIndex = focusedIndex;

      const isHorizontal = orientation === 'horizontal' || orientation === 'both';
      const isVertical = orientation === 'vertical' || orientation === 'both';

      if ((e.key === 'ArrowRight' && isHorizontal) || (e.key === 'ArrowDown' && isVertical)) {
        e.preventDefault();
        newIndex = (focusedIndex + 1) % len;
      } else if ((e.key === 'ArrowLeft' && isHorizontal) || (e.key === 'ArrowUp' && isVertical)) {
        e.preventDefault();
        newIndex = (focusedIndex - 1 + len) % len;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(focusedIndex);
        return;
      } else {
        return;
      }

      setFocusedIndex(newIndex);
      itemRefs.current[newIndex]?.focus();
    },
    [focusedIndex, itemCount, onSelect, orientation]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: focusedIndex === index ? 0 : -1,
      onKeyDown: handleKeyDown,
      ref: (el: HTMLElement | null) => {
        itemRefs.current[index] = el;
      },
    }),
    [focusedIndex, handleKeyDown]
  );

  return { focusedIndex, setFocusedIndex, getItemProps };
}
