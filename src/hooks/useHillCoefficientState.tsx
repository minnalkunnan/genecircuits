import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    ReactNode,
  } from 'react';
  import { HillCoefficientData } from '../types';
  
// ---------- Internal Hook ----------
function useHillCoefficientState(usedProteins: Set<string>) {
  const [hillCoefficients, setHillCoefficients] = useState<HillCoefficientData[]>([]);

  useEffect(() => {
    const labels = Array.from(usedProteins).sort();

    setHillCoefficients((prev) => {
      const prevMap = new Map(prev.map((h) => [h.id, h.value]));
      const freshMatrix: HillCoefficientData[] = [];
      for (const source of labels) {
        for (const target of labels) {
          const id = `${source}-${target}`;
          freshMatrix.push({ id, value: prevMap.get(id) ?? 1 });
        }
      }
      const same = freshMatrix.length === prev.length && freshMatrix.every((entry, i) =>
        prev[i]?.id === entry.id && prev[i]?.value === entry.value
      );
      return same ? prev : freshMatrix;
    });
  }, [usedProteins]);
  
  

  const updateCoefficient = (id: string, value: number) => {
    setHillCoefficients(prev =>
      prev.map(coeff =>
        coeff.id === id ? { ...coeff, value } : coeff
      )
    );
  };

  const getCoefficientValue = (source: string, target: string): number => {
    const id = `${source}-${target}`;
    const coeff = hillCoefficients.find(h => h.id === id);
    return coeff ? coeff.value : 1;
  };

  const resetCoefficients = () => {
    setHillCoefficients(prev =>
      prev.map(coeff => ({ ...coeff, value: 1 }))
    );
  };

  return {
    hillCoefficients,
    setHillCoefficients,
    updateCoefficient,
    getCoefficientValue,
    resetCoefficients,
  };
}

export type HillCoefficientState = ReturnType<typeof useHillCoefficientState>;

// ---------- Context + Provider ----------
const HillCoefficientContext = createContext<HillCoefficientState | null>(null);

export const HillCoefficientProvider = ({
  usedProteins,
  children,
}: {
  usedProteins: Set<string>;
  children: ReactNode;
}) => {
  const state = useHillCoefficientState(usedProteins);
  const memoized = useMemo(() => state, [state.hillCoefficients]);

  return (
    <HillCoefficientContext.Provider value={memoized}>
      {children}
    </HillCoefficientContext.Provider>
  );
};

export const useHillCoefficientContext = (): HillCoefficientState => {
  const context = useContext(HillCoefficientContext);
  if (!context) {
    throw new Error('useHillCoefficientContext must be used within a HillCoefficientProvider');
  }
  return context;
};
