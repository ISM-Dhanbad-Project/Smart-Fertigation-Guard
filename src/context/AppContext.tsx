"use client";

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, SensorReading, ClogRiskLevel } from '@/types';

type Action =
  | { type: 'UPDATE_READING'; payload: SensorReading }
  | { type: 'TOGGLE_PUMP'; payload: { nodeId: string; pump: keyof SensorReading['pump_status']; state: boolean } }
  | { type: 'TOGGLE_SOLENOID'; payload: { nodeId: string; state: boolean } }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_CLOG_RISK'; payload: { nodeId: string; level: ClogRiskLevel; score: number } }
  | { type: 'TOGGLE_ANOMALY'; payload: { nodeId: string | null; forceFailure: boolean } }
  | { type: 'TRIGGER_PENDING_FLUSH'; payload: { nodeId: string; signals: string; windowMs: number } }
  | { type: 'CANCEL_PENDING_FLUSH'; payload: { nodeId: string } }
  | { type: 'DISMISS_PENDING_FLUSH'; payload: { nodeId: string } }
  | { type: 'FLUSH_COMPLETED'; payload: { nodeId: string } }
  | { type: 'HIGH_PRIORITY_ALERT'; payload: { nodeId: string; message: string } }
  | { type: 'DISMISS_ALERT'; payload: { nodeId: string } }
  | { type: 'SET_LANGUAGE'; payload: 'EN' | 'HI' };

const initialState: AppState = {
  nodes: {},
  clogRisk: {},
  isOnline: true,
  forceAnomalyNode: null,
  forceFlushFailure: false,
  alerts: {},
  lastFlushedTime: {},
  pendingFlushes: {},
  overriddenFlushes: {},
  language: 'EN',
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
      return { 
        ...state, 
        forceAnomalyNode: action.payload.nodeId, 
        forceFlushFailure: action.payload.forceFailure 
      };
    case 'TRIGGER_PENDING_FLUSH': {
      const { nodeId, signals, windowMs } = action.payload;
      // If already overridden or already pending, ignore
      if (state.overriddenFlushes[nodeId] || state.pendingFlushes[nodeId]) {
        return state;
      }
      return {
        ...state,
        pendingFlushes: {
          ...state.pendingFlushes,
          [nodeId]: {
            nodeId,
            expiresAt: Date.now() + windowMs,
            signals,
          },
        },
      };
    }
    case 'CANCEL_PENDING_FLUSH': {
      const { nodeId } = action.payload;
      const nextPending = { ...state.pendingFlushes };
      delete nextPending[nodeId];
      return {
        ...state,
        pendingFlushes: nextPending,
        overriddenFlushes: {
          ...state.overriddenFlushes,
          [nodeId]: true,
        },
      };
    }
    case 'DISMISS_PENDING_FLUSH': {
      const { nodeId } = action.payload;
      const nextPending = { ...state.pendingFlushes };
      delete nextPending[nodeId];
      return {
        ...state,
        pendingFlushes: nextPending,
      };
    }
    case 'FLUSH_COMPLETED':
      return {
        ...state,
        lastFlushedTime: { ...state.lastFlushedTime, [action.payload.nodeId]: Date.now() }
      };
    case 'HIGH_PRIORITY_ALERT':
      return {
        ...state,
        alerts: { ...state.alerts, [action.payload.nodeId]: action.payload.message }
      };
    case 'DISMISS_ALERT': {
      const nextAlerts = { ...state.alerts };
      delete nextAlerts[action.payload.nodeId];
      return {
        ...state,
        alerts: nextAlerts
      };
    }
    case 'SET_LANGUAGE':
      return {
        ...state,
        language: action.payload,
      };
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
