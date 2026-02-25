import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, useMemo } from 'react';

// Separate context for state (causes re-renders)
interface MuteStateContextType {
  isMuted: boolean;
}

// Separate context for actions (stable, no re-renders)
interface MuteActionsContextType {
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  getMutedRef: () => React.MutableRefObject<boolean>;
}

// Combined type for backwards compatibility
interface MuteContextType extends MuteStateContextType, MuteActionsContextType {}

const MuteStateContext = createContext<MuteStateContextType | undefined>(undefined);
const MuteActionsContext = createContext<MuteActionsContextType | undefined>(undefined);

interface MuteProviderProps {
  children: ReactNode;
}

export const MuteProvider: React.FC<MuteProviderProps> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);
  // Keep a ref in sync with state for non-reactive access
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
  }, []);

  const getMutedRef = useCallback(() => isMutedRef, []);

  // Actions context value is stable (memoized with empty deps)
  const actionsValue = useMemo(() => ({
    toggleMute,
    setMuted,
    getMutedRef,
  }), [toggleMute, setMuted, getMutedRef]);

  // State context value changes when isMuted changes
  const stateValue = useMemo(() => ({
    isMuted,
  }), [isMuted]);

  return (
    <MuteActionsContext.Provider value={actionsValue}>
      <MuteStateContext.Provider value={stateValue}>
        {children}
      </MuteStateContext.Provider>
    </MuteActionsContext.Provider>
  );
};

// Original hook - subscribes to state changes (causes re-renders)
export const useMute = (): MuteContextType => {
  const stateContext = useContext(MuteStateContext);
  const actionsContext = useContext(MuteActionsContext);
  if (stateContext === undefined || actionsContext === undefined) {
    throw new Error('useMute must be used within a MuteProvider');
  }
  return { ...stateContext, ...actionsContext };
};

// Hook that provides mute controls WITHOUT causing re-renders on mute state changes
// Use this in components where you only need to toggle/set mute, not react to mute changes
export const useMuteActions = (): MuteActionsContextType => {
  const context = useContext(MuteActionsContext);
  if (context === undefined) {
    throw new Error('useMuteActions must be used within a MuteProvider');
  }
  return context;
};

// Hook that only subscribes to mute state (for components that need to react to mute changes)
export const useMuteState = (): MuteStateContextType => {
  const context = useContext(MuteStateContext);
  if (context === undefined) {
    throw new Error('useMuteState must be used within a MuteProvider');
  }
  return context;
};

export default MuteStateContext;
