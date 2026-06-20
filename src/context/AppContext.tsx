"use client";

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, SensorReading, ClogRiskLevel } from '@/types';

type Action =
  | { type: 'UPDATE_READING'; payload: SensorReading }
  | { type: 'TOGGLE_PUMP'; payload: { nodeId: string; pump: keyof SensorReading['pump_status']; state: boolean } }
  | { type: 'TOGGLE_SOLENOID'; payload: { nodeId: string; state: boolean } }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_CLOG_RISK'; payload: { nodeId: string; level: ClogRiskLevel; score: number } }
  | { type: 'TOGGLE_ANOMALY'; payload: boolean };

const initialState: AppState = {
  nodes: {},
  clogRisk: {},
  isOnline: true,
  forceAnomaly: false,
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'UPDATE_READING':
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.payload.node_id]: action.payload,
        },
      };
    case 'TOGGLE_PUMP': {
      const node = state.nodes[action.payload.nodeId];
      if (!node) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.payload.nodeId]: {
            ...node,
            pump_status: {
              ...node.pump_status,
              [action.payload.pump]: action.payload.state,
            },
          },
        },
      };
    }
    case 'TOGGLE_SOLENOID': {
      const node = state.nodes[action.payload.nodeId];
      if (!node) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.payload.nodeId]: {
            ...node,
            solenoid_status: action.payload.state,
          },
        },
      };
    }
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload };
    case 'SET_CLOG_RISK':
      return {
        ...state,
        clogRisk: {
          ...state.clogRisk,
          [action.payload.nodeId]: { level: action.payload.level, score: action.payload.score },
        },
      };
    case 'TOGGLE_ANOMALY':
      return { ...state, forceAnomaly: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Here we would also add event listeners for online/offline status
  React.useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
    const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
