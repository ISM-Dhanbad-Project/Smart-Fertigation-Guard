import { useCallback, useRef, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { saveReadingLocal } from '@/services/db';
import { syncBatchToFirestore } from '@/services/firebase';
import { SensorReading, ClogRiskLevel } from '@/types';
import { predictClogRisk } from '@/services/ai';

export function useSensorPipeline() {
  const { state, dispatch } = useAppContext();
  const queueRef = useRef<SensorReading[]>([]);
  const windowRef = useRef<Record<string, SensorReading[]>>({});
  
  const getStats = (arr: number[]) => {
    if (arr.length === 0) return { mean: 0, stdDev: 0 };
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const stdDev = Math.sqrt(arr.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / arr.length);
    return { mean, stdDev };
  };

  const ingestReading = useCallback(async (reading: SensorReading) => {
    const nodeId = reading.node_id;
    
    // 1. Write to local IndexedDB
    await saveReadingLocal(reading).catch(console.error);

    // 2. Queue for Firebase Sync
    queueRef.current.push(reading);

    // 3. Z-score Anomaly Filter
    if (!windowRef.current[nodeId]) windowRef.current[nodeId] = [];
    const win = windowRef.current[nodeId];
    
    let isAnomaly = false;
    
    if (win.length === 20) {
      const ecs = win.map(r => r.ec);
      const { mean, stdDev } = getStats(ecs);
      if (stdDev > 0) {
        const zScore = Math.abs((reading.ec - mean) / stdDev);
        if (zScore > 3) {
          console.warn(`[Anomaly Detected] Node: ${nodeId}, EC: ${reading.ec}, Z-Score: ${zScore.toFixed(2)}`);
          isAnomaly = true;
          // In a real app, we'd flag this as an "event" in the IDB events store
        }
      }
    }
    
    win.push(reading);
    if (win.length > 20) win.shift();

    // 4. Run AI Clogging Predictor
    if (win.length >= 5) {
      const risk = await predictClogRisk(win);
      dispatch({ type: 'SET_CLOG_RISK', payload: { nodeId, level: risk.level, score: risk.score } });
    }

    // 5. Rule-based Autonomous Flush Engine (Phase 3)
    let ecRise = false;
    if (win.length >= 4) {
      const recent = win.slice(-4);
      const ecRises = [
        recent[1].ec - recent[0].ec,
        recent[2].ec - recent[1].ec,
        recent[3].ec - recent[2].ec
      ];
      ecRise = ecRises.every(rise => rise > 0.15);
    }
    
    let flowDrop = false;
    if (win.length >= 2) {
      const flows = win.slice(0, -1).map(r => r.flow_rate);
      const { mean: avgFlow } = getStats(flows);
      if (avgFlow > 0 && ((avgFlow - reading.flow_rate) / avgFlow) > 0.08) {
        flowDrop = true;
      }
    }

    let pressureDrop = false;
    if (win.length >= 2) {
      const pressures = win.slice(0, -1).map(r => r.pressure);
      const { mean: avgPressure } = getStats(pressures);
      const prevReading = win[win.length - 2];
      const pumpStateChanged = prevReading && (
        prevReading.pump_status.main !== reading.pump_status.main ||
        prevReading.pump_status.dose_a !== reading.pump_status.dose_a ||
        prevReading.pump_status.dose_b !== reading.pump_status.dose_b ||
        prevReading.pump_status.dose_base !== reading.pump_status.dose_base
      );
      if (!pumpStateChanged && avgPressure > 0 && ((avgPressure - reading.pressure) / avgPressure) > 0.10) {
        pressureDrop = true;
      }
    }

    let turbiditySpike = false;
    if (win.length >= 3) {
      const recent = win.slice(-3);
      turbiditySpike = recent.every(r => r.turbidity > 100);
    }

    const activeSignals = [
      { name: 'EC Rise', active: ecRise },
      { name: 'Flow Drop', active: flowDrop },
      { name: 'Pressure Drop', active: pressureDrop },
      { name: 'Turbidity Spike', active: turbiditySpike }
    ];
    const activeCount = activeSignals.filter(s => s.active).length;

    if (activeCount >= 2) {
      const signalsTriggered = activeSignals.filter(s => s.active).map(s => s.name).join(', ');
      dispatch({ type: 'TRIGGER_PENDING_FLUSH', payload: { nodeId, signals: signalsTriggered } });
    }

    // Finally, update global state for the Dashboard UI
    dispatch({ type: 'UPDATE_READING', payload: reading });

  }, [dispatch]);

  // Sync Interval
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      if (state.isOnline && queueRef.current.length > 0) {
        const batch = [...queueRef.current];
        queueRef.current = [];
        try {
          await syncBatchToFirestore(batch);
        } catch (e) {
          queueRef.current = [...batch, ...queueRef.current]; // Re-queue
        }
      }
    }, 10000);
    return () => clearInterval(syncInterval);
  }, [state.isOnline]);

  return { ingestReading };
}
