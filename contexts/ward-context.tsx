import { loadPreferences } from '@/lib/preferences';
import { loadWard, saveWard } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import type { Bed, PatientData, UserPreferences, Ward } from '@/lib/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

interface WardContextValue {
  ward: Ward | null;
  isLoading: boolean;
  reloadWard: () => Promise<void>;
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
const DEFAULT_WARD_NUMBER = '1';
const INITIAL_BED_COUNT = 12;

function createInitialWard(prefs?: UserPreferences | null): Ward {
  const title = prefs?.defaultDepartment?.trim() || DEFAULT_TITLE;
  const wardNumber = prefs?.defaultWardNumber?.trim() || DEFAULT_WARD_NUMBER;
  const bedCount = Math.min(
    Math.max(1, prefs?.defaultBedCount ?? INITIAL_BED_COUNT),
    100
  );
  const beds: Bed[] = Array.from({ length: bedCount }, (_, i) => ({
    id: generateId(),
    number: i + 1,
  }));
  return {
    id: generateId(),
    title,
    wardNumber,
    beds,
  };
}

export function WardProvider({ children }: { children: ReactNode }) {
  const [ward, setWard] = useState<Ward | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const wardRef = useRef<Ward | null>(null);
  wardRef.current = ward;

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadWard(), loadPreferences()])
      .then(async ([loaded, prefs]) => {
        if (cancelled) return;
        let next: Ward;
        try {
          next = loaded ?? createInitialWard(prefs);
        } catch {
          next = createInitialWard(prefs);
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
          loadPreferences()
            .then((prefs) => {
              if (!cancelled) {
                const initial = createInitialWard(prefs);
                setWard(initial);
                saveWard(initial).catch(() => {});
                setIsLoading(false);
              }
            })
            .catch(() => {
              if (!cancelled) {
                setWard(createInitialWard(null));
                setIsLoading(false);
              }
            });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist to storage when app goes to background or closes so data is never lost
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        const current = wardRef.current;
        if (current) saveWard(current).catch(() => {});
      }
    });
    return () => sub.remove();
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

  const reloadWard = useCallback(async () => {
    const loaded = await loadWard();
    if (loaded) setWard(loaded);
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
      reloadWard,
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
      reloadWard,
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
