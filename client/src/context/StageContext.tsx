import React, { createContext, useContext, useState, useEffect } from 'react';
import { StageIdentifier } from '../types/index.js';
import { api } from '../services/api.js';

interface StageContextType {
  activeStage: StageIdentifier;
  stageDetails: any;
  gates: { canAdvance: boolean; blockers: string[]; metrics: Record<string, any> } | null;
  allStages: StageIdentifier[];
  loading: boolean;
  refreshStage: () => Promise<void>;
  transitionStage: (toStage: StageIdentifier, reason: string, forceException?: boolean) => Promise<void>;
}

const StageContext = createContext<StageContextType | undefined>(undefined);

export const StageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeStage, setActiveStage] = useState<StageIdentifier>('registration');
  const [stageDetails, setStageDetails] = useState<any>(null);
  const [gates, setGates] = useState<any>(null);
  const [allStages, setAllStages] = useState<StageIdentifier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshStage = async () => {
    try {
      const data = await api.get<{
        activeStage: StageIdentifier;
        details: any;
        gates: any;
        allStages: StageIdentifier[];
      }>('/system/stage');

      setActiveStage(data.activeStage);
      setStageDetails(data.details);
      setGates(data.gates);
      setAllStages(data.allStages);
    } catch (err) {
      console.error('[Stage] Failed to load event stage:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStage();
  }, []);

  const transitionStage = async (toStage: StageIdentifier, reason: string, forceException = false) => {
    await api.post('/system/stage/transition', { toStage, reason, forceException });
    await refreshStage();
  };

  return (
    <StageContext.Provider
      value={{
        activeStage,
        stageDetails,
        gates,
        allStages,
        loading,
        refreshStage,
        transitionStage,
      }}
    >
      {children}
    </StageContext.Provider>
  );
};

export const useStage = () => {
  const context = useContext(StageContext);
  if (!context) throw new Error('useStage must be used within a StageProvider');
  return context;
};
