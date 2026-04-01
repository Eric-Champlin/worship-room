/// <reference types="vitest" />
import { renderHook, act } from '@testing-library/react';
import { useRovingTabindex } from '../useRovingTabindex';

describe('useRovingTabindex', () => {
  const defaultOptions = {
    itemCount: 5,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns focusedIndex starting at 0 by default', () => {
    const { result } = renderHook(() => useRovingTabindex(defaultOptions));
    expect(result.current.focusedIndex).toBe(0);
  });

  it('returns focusedIndex starting at initialIndex', () => {
    const { result } = renderHook(() =>
      useRovingTabindex({ ...defaultOptions, initialIndex: 3 })
    );
    expect(result.current.focusedIndex).toBe(3);
  });

  it('ArrowRight moves focus to next item', () => {
    const { result } = renderHook(() => useRovingTabindex(defaultOptions));

    const props = result.current.getItemProps(0);
    act(() => {
      props.onKeyDown({
        key: 'ArrowRight',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.focusedIndex).toBe(1);
  });

  it('ArrowLeft moves focus to previous item', () => {
    const { result } = renderHook(() =>
      useRovingTabindex({ ...defaultOptions, initialIndex: 2 })
    );

    const props = result.current.getItemProps(2);
    act(() => {
      props.onKeyDown({
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.focusedIndex).toBe(1);
  });

  it('wraps around from last to first', () => {
    const { result } = renderHook(() =>
      useRovingTabindex({ ...defaultOptions, initialIndex: 4 })
    );

    const props = result.current.getItemProps(4);
    act(() => {
      props.onKeyDown({
        key: 'ArrowRight',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.focusedIndex).toBe(0);
  });

  it('wraps around from first to last', () => {
    const { result } = renderHook(() => useRovingTabindex(defaultOptions));

    const props = result.current.getItemProps(0);
    act(() => {
      props.onKeyDown({
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.focusedIndex).toBe(4);
  });

  it('Enter calls onSelect with current index', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useRovingTabindex({ ...defaultOptions, onSelect, initialIndex: 2 })
    );

    const props = result.current.getItemProps(2);
    act(() => {
      props.onKeyDown({
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('Space calls onSelect with current index', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useRovingTabindex({ ...defaultOptions, onSelect, initialIndex: 1 })
    );

    const props = result.current.getItemProps(1);
    act(() => {
      props.onKeyDown({
        key: ' ',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('only focused item has tabIndex 0', () => {
    const { result } = renderHook(() =>
      useRovingTabindex({ ...defaultOptions, initialIndex: 2 })
    );

    expect(result.current.getItemProps(2).tabIndex).toBe(0);
    expect(result.current.getItemProps(0).tabIndex).toBe(-1);
    expect(result.current.getItemProps(1).tabIndex).toBe(-1);
    expect(result.current.getItemProps(3).tabIndex).toBe(-1);
    expect(result.current.getItemProps(4).tabIndex).toBe(-1);
  });

  it('non-focused items have tabIndex -1', () => {
    const { result } = renderHook(() => useRovingTabindex(defaultOptions));

    for (let i = 1; i < 5; i++) {
      expect(result.current.getItemProps(i).tabIndex).toBe(-1);
    }
  });

  describe('orientation', () => {
    it('horizontal: ArrowDown does not move focus', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ ...defaultOptions, orientation: 'horizontal' })
      );

      const props = result.current.getItemProps(0);
      act(() => {
        props.onKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.focusedIndex).toBe(0);
    });

    it('vertical: ArrowDown moves focus to next item', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ ...defaultOptions, orientation: 'vertical' })
      );

      const props = result.current.getItemProps(0);
      act(() => {
        props.onKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.focusedIndex).toBe(1);
    });

    it('vertical: ArrowRight does not move focus', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ ...defaultOptions, orientation: 'vertical' })
      );

      const props = result.current.getItemProps(0);
      act(() => {
        props.onKeyDown({
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.focusedIndex).toBe(0);
    });

    it('both: all four arrow keys move focus', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ ...defaultOptions, orientation: 'both' })
      );

      const props0 = result.current.getItemProps(0);
      act(() => {
        props0.onKeyDown({
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.focusedIndex).toBe(1);

      const props1 = result.current.getItemProps(1);
      act(() => {
        props1.onKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.focusedIndex).toBe(2);

      const props2 = result.current.getItemProps(2);
      act(() => {
        props2.onKeyDown({
          key: 'ArrowLeft',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.focusedIndex).toBe(1);

      const props1b = result.current.getItemProps(1);
      act(() => {
        props1b.onKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.focusedIndex).toBe(0);
    });
  });
});
