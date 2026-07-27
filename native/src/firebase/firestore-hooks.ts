import {
  onSnapshot,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type Query,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

/**
 * Live collection subscription, same contract as the web's useCollection:
 * `data` is null while loading, then stays in sync with Firestore. The ref
 * must be memoized by the caller (pass null to disable, e.g. while logged out).
 */
export function useCollection<T = DocumentData>(
  ref: CollectionReference | Query | null
): { data: (T & { id: string })[] | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<(T & { id: string })[] | null>(null);
  const [loading, setLoading] = useState(!!ref);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setData(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [ref]);

  return { data, loading, error };
}

/** Live single-document subscription. `data` is null while loading or missing. */
export function useDoc<T = DocumentData>(
  ref: DocumentReference | null
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!ref);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setData(snap.exists() ? (snap.data() as T) : null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [ref]);

  return { data, loading, error };
}
