import { useEffect, RefObject } from 'react';

export function useScrollIntoViewOnFocus(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => {
      // Small delay to allow keyboard to appear
      setTimeout(() => {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);
    };

    element.addEventListener('focus', handleFocus);
    return () => {
      element.removeEventListener('focus', handleFocus);
    };
  }, [ref]);
}
