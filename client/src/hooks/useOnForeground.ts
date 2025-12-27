import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';

/**
 * Hook that executes a callback when the app returns to the foreground.
 */
export function useOnForeground(cb: () => void) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      appState.current = next;
      if ((prev === 'inactive' || prev === 'background') && next === 'active') {
        cb();
      }
    });
    return () => sub.remove();
  }, [cb]);
}
