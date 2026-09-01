import { useCallback, useRef, useState } from 'react';

export interface Toast { id: number; msg: string; out?: boolean }

/** The small orange notices in the top-right corner. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const toast = useCallback((msg: string) => {
    const id = next.current++;
    setToasts((t) => [...t, { id, msg }]);
    window.setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, out: true } : x)));
      window.setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 420);
    }, 2400);
  }, []);

  return { toasts, toast };
}
