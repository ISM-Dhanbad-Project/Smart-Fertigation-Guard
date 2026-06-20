export interface PumpStatus {
  main: boolean;
  dose_a: boolean;
  dose_b: boolean;
  dose_base: boolean;
}

export interface SensorReading {
  node_id: string;
  timestamp: string; // ISO8601
  ph: number; // 0-14
  ec: number; // mS/cm
  ec_temp_compensated: number;
  flow_rate: number; // L/min
  pressure: number; // kPa
  turbidity: number; // NTU
  temperature: number; // °C
  battery_pct: number;
  pump_status: PumpStatus;
  solenoid_status: boolean;
}

export type ClogRiskLevel = 'GREEN' | 'AMBER' | 'RED';

export interface AppState {
  nodes: Record<string, SensorReading>;
  clogRisk: Record<string, { level: ClogRiskLevel; score: number }>;
  isOnline: boolean;
  forceAnomaly: boolean;
}
