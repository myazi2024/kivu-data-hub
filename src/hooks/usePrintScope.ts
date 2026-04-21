import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook to print only the host element marked with `data-print-host`.
 *
 * Usage:
 *   const { printRef, print } = usePrintScope();
 *   <div ref={printRef}>...content to print...</div>
 *   <button onClick={print}>Print</button>
 *
 * Adds `print-scope-active` to <body> before printing and removes it after,
 * working with the global @media print rule in src/index.css that hides every
 * direct child of <body> except the one carrying `data-print-host`.
 */
export function usePrintScope<T extends HTMLElement = HTMLDivElement>() {
  const printRef = useRef<T | null>(null);

  // Tag the element with data-print-host whenever it mounts
  useEffect(() => {
    const el = printRef.current;
    if (!el) return;
    el.setAttribute('data-print-host', 'true');
    return () => {
      el.removeAttribute('data-print-host');
    };
  }, []);

  const print = useCallback(() => {
    const cleanup = () => {
      document.body.classList.remove('print-scope-active');
      window.removeEventListener('afterprint', cleanup);
    };
    document.body.classList.add('print-scope-active');
    window.addEventListener('afterprint', cleanup);
    // Defer to next tick so the class is applied before the print dialog
    setTimeout(() => {
      try {
        window.print();
      } finally {
        // Safety net for browsers that don't fire afterprint reliably
        setTimeout(cleanup, 1000);
      }
    }, 0);
  }, []);

  return { printRef, print };
}
