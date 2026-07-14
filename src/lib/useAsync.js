// qup-pulse-admin/src/lib/useAsync.js
'use client';

import { useCallback, useEffect, useState } from 'react';

// Small helper: run an async fn, expose { data, loading, error, reload }.
export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const run = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fn();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, reload: run };
}
