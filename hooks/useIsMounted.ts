import { useEffect, useRef } from 'react';

/**
 * Hook to check if component is still mounted
 * Prevents setState calls on unmounted components
 *
 * Usage:
 * const isMounted = useIsMounted();
 *
 * someAsyncFunction().then(() => {
 *   if (isMounted.current) {
 *     setState(newValue);
 *   }
 * });
 */
export const useIsMounted = () => {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
};

export default useIsMounted;
