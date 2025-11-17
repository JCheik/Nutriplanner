'use client';
import {
  onSnapshot,
  doc,
  DocumentReference,
  setDoc,
  DocumentData,
  SetOptions,
} from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';

import { useFirestore } from '..';

type DocOptions = {
  listen: boolean;
};

export const useDoc = <T,>(
  docRef: DocumentReference | null,
  options: DocOptions = { listen: true }
) => {
  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const memoizedRef = useMemo(() => docRef, [docRef?.path]);

  useEffect(() => {
    if (!memoizedRef) {
      setLoading(false);
      return;
    }

    if (!options.listen) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      memoizedRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setDataState({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setDataState(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedRef, options.listen]);

  const setData = async (data: T, options?: SetOptions) => {
    if (memoizedRef) {
        await setDoc(memoizedRef, data, options || {});
        if (!options?.merge) {
            setDataState(data);
        } else {
            setDataState(prev => ({...prev, ...data}));
        }
    }
  }


  return { data, loading, error, setData };
};
