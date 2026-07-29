// qup-pulse-admin/src/lib/useInfiniteScroll.js
"use client";

// Automatic pagination via IntersectionObserver.
//
//   const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore: loadNext });
//   ...
//   {hasMore ? <div ref={sentinelRef} className="h-px" /> : null}
//
// Place the sentinel AFTER the last list item. It fires while still off-screen
// (see rootMargin) so the next page is usually in hand before the user reaches
// the bottom — the point of dropping the button is that nothing interrupts, and
// a spinner appearing at the fold is only marginally better than a click.
//
// The observer is torn down and rebuilt when `loading` flips. That is
// deliberate: an observer left connected during a fetch re-fires the moment the
// list grows and the sentinel is briefly still in view, which requests page 3
// before page 2 has rendered.

import { useCallback, useEffect, useRef } from "react";

// How far below the viewport the sentinel triggers.
const DEFAULT_ROOT_MARGIN = "400px";

export function useInfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  rootMargin = DEFAULT_ROOT_MARGIN,
  disabled = false,
}) {
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  // Held in a ref so a callback recreated on every render does not tear the
  // observer down and rebuild it on every render with it.
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node || disabled || loading || !hasMore) {
      cleanup();
      return undefined;
    }

    // Server-rendered pass, or a browser old enough to lack it. The caller
    // should keep a manual button rendered as a fallback — see the note below.
    if (typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        // Stop watching immediately. Without this the same intersection can
        // deliver twice before React has re-rendered with loading = true.
        observer.disconnect();
        onLoadMoreRef.current?.();
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(node);
    observerRef.current = observer;

    return cleanup;
  }, [hasMore, loading, rootMargin, disabled, cleanup]);

  return sentinelRef;
}

export default useInfiniteScroll;
