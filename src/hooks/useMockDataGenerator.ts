import { useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useSensorPipeline } from './useSensorPipeline';
import { SensorReading } from '@/types';

export const MOCK_NODE_IDS = ['ZONE-A-01', 'ZONE-B-02', 'ZONE-C-03'];

function generateNormalDistribution(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

export function useMockDataGenerator(intervalMs = 3000) {
  const { state } = useAppContext();
  const { ingestReading } = useSensorPipeline();
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const { forceAnomalyNode } = stateRef.current;
      
      MOCK_NODE_IDS.forEach(node_id => {
        const timestamp = new Date().toISOString();
        const baseNode = stateRef.current.nodes[node_id];
        
        let ph = generateNormalDistribution(6.0, 0.1);
        let ec = generateNormalDistribution(1.5, 0.05);
        let flow_rate = generateNormalDistribution(50, 1.5);
        let pressure = generateNormalDistribution(200, 3);
        let turbidity = generateNormalDistribution(10, 1);
        let temperature = generateNormalDistribution(25, 0.2);
        
        if (forceAnomalyNode === node_id) {
           // Inject outliers probabilistically if anomaly is targeted at this node
           if (Math.random() > 0.7) ph += 1.5;
           if (Math.random() > 0.5) ec += 0.8;
           if (Math.random() > 0.4) flow_rate -= 15;
           if (Math.random() > 0.4) pressure -= 40;
           if (Math.random() > 0.3) turbidity += 90;
        }

        const ec_comp = ec / (1 + 0.019 * (temperature - 25));

        const reading: SensorReading = {
          node_id,
          timestamp,
          ph: Number(Math.max(0, Math.min(14, ph)).toFixed(2)),
          ec: Number(Math.max(0, ec).toFixed(2)),
          ec_temp_compensated: Number(Math.max(0, ec_comp).toFixed(2)),
          flow_rate: Number(Math.max(0, flow_rate).toFixed(2)),
          pressure: Number(Math.max(0, pressure).toFixed(2)),
          turbidity: Number(Math.max(0, turbidity).toFixed(2)),
          temperature: Number(temperature.toFixed(2)),
          battery_pct: Number(Math.max(0, Math.min(100, generateNormalDistribution(85, 2))).toFixed(1)),
          pump_status: baseNode ? baseNode.pump_status : { main: false, dose_a: false, dose_b: false, dose_base: false },
          solenoid_status: baseNode ? baseNode.solenoid_status : false,
        };

        ingestReading(reading);
      });
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [intervalMs, ingestReading]);
}
