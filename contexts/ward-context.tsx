import { generateId } from '@/lib/utils';
import { loadWard, saveWard } from '@/lib/storage';
import type { Bed, PatientData, Ward } from '@/lib/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface WardContextValue {
  ward: Ward | null;
  isLoading: boolean;
  updateTitle: (title: string) => Promise<void>;
  updateWardNumber: (wardNumber: string) => Promise<void>;
  addBeds: (count: number) => Promise<void>;
  deleteBed: (bedId: string) => Promise<void>;
  dischargePatient: (bedId: string) => Promise<void>;
  updateBedPatient: (bedId: string, patient: PatientData) => Promise<void>;
  getBed: (bedId: string) => Bed | undefined;
}

const WardContext = createContext<WardContextValue | null>(null);

const DEFAULT_TITLE = 'Surgery Department';
const INITIAL_BED_COUNT = 12;

function createInitialWard(): Ward {
  const beds: Bed[] = Array.from({ length: INITIAL_BED_COUNT }, (_, i) => ({
    id: generateId(),
    number: i + 1,
  }));
  return {
    id: generateId(),
    title: DEFAULT_TITLE,
    wardNumber: '1',
    beds,
  };
}

export function WardProvider({ children }: { children: ReactNode }) {
  const [ward, setWard] = useState<Ward | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadWard()
      .then(async (loaded) => {
        if (cancelled) return;
        let next: Ward;
        try {
          next = loaded ?? createInitialWard();
        } catch {
          next = createInitialWard();
        }
        setWard(next);
        if (!loaded) {
          try {
            await saveWard(next);
          } catch {
            // Still show UI; will retry on first user action
          }
        }
        if (!cancelled) setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          const initial = createInitialWard();
          setWard(initial);
          saveWard(initial).catch(() => {});
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: Ward) => {
    setWard(next);
    try {
      await saveWard(next);
    } catch {
      try {
        await saveWard(next);
      } catch {
        // Keep optimistic UI; user data is in state
      }
    }
  }, []);

  const updateTitle = useCallback(
    async (title: string) => {
      if (!ward) return;
      const next = { ...ward, title };
      await persist(next);
    },
    [ward, persist]
  );

  const updateWardNumber = useCallback(
    async (wardNumber: string) => {
      if (!ward) return;
      const next = { ...ward, wardNumber: wardNumber || undefined };
      await persist(next);
    },
    [ward, persist]
  );

  const addBeds = useCallback(
    async (count: number) => {
      if (!ward || count < 1) return;
      const maxNum = Math.max(...ward.beds.map((b) => b.number), 0);
      const newBeds: Bed[] = Array.from({ length: count }, (_, i) => ({
        id: generateId(),
        number: maxNum + i + 1,
      }));
      const next = { ...ward, beds: [...ward.beds, ...newBeds] };
      await persist(next);
    },
    [ward, persist]
  );

  const deleteBed = useCallback(
    async (bedId: string) => {
      if (!ward) return;
      const beds = ward.beds.filter((b) => b.id !== bedId);
      const renumbered = beds
        .sort((a, b) => a.number - b.number)
        .map((b, i) => ({ ...b, number: i + 1 }));
      await persist({ ...ward, beds: renumbered });
    },
    [ward, persist]
  );

  const dischargePatient = useCallback(
    async (bedId: string) => {
      if (!ward) return;
      const beds = ward.beds.map((b) =>
        b.id === bedId ? { ...b, patient: undefined } : b
      );
      await persist({ ...ward, beds });
    },
    [ward, persist]
  );

  const updateBedPatient = useCallback(
    async (bedId: string, patient: PatientData) => {
      if (!ward) return;
      const beds = ward.beds.map((b) =>
        b.id === bedId ? { ...b, patient } : b
      );
      await persist({ ...ward, beds });
    },
    [ward, persist]
  );

  const getBed = useCallback(
    (bedId: string) => ward?.beds.find((b) => b.id === bedId),
    [ward]
  );

  const value = useMemo<WardContextValue>(
    () => ({
      ward,
      isLoading,
      updateTitle,
      updateWardNumber,
      addBeds,
      deleteBed,
      dischargePatient,
      updateBedPatient,
      getBed,
    }),
    [
      ward,
      isLoading,
      updateTitle,
      updateWardNumber,
      addBeds,
      deleteBed,
      dischargePatient,
      updateBedPatient,
      getBed,
    ]
  );

  return <WardContext.Provider value={value}>{children}</WardContext.Provider>;
}

export function useWard() {
  const ctx = useContext(WardContext);
  if (!ctx) throw new Error('useWard must be used within WardProvider');
  return ctx;
}
