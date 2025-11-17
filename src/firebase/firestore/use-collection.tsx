'use client';
import {
  collection,
  onSnapshot,
  query,
  Query,
  DocumentData,
  Firestore,
  CollectionReference,
  addDoc,
  doc,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';

import { useFirestore } from '..';

type CollectionOptions<T> = {
  onNewData?: (data: T[]) => T[];
};

export const useCollection = <T,>(
  collectionRef: CollectionReference | Query | null,
  options?: CollectionOptions<T>
) => {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const memoizedRef = useMemo(() => collectionRef, [collectionRef?.path, (collectionRef as Query)?._query?.filters]);

  useEffect(() => {
    if (!memoizedRef) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      memoizedRef,
      (snapshot) => {
        let docs = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as T)
        );
        if (options?.onNewData) {
          docs = options.onNewData(docs);
        }
        setData(docs);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedRef, options]);

  return { data, loading, error, setData };
};
