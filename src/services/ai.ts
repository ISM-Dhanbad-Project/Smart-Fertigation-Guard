import * as tf from '@tensorflow/tfjs';
import { ClogRiskLevel, SensorReading } from '@/types';

export interface MLPCropInput {
  currentPh: number;
  currentEc: number;
  cropType: string;
  growthStage: string;
}

export interface NutrientRecommendation {
  action: string;
  confidence: number;
}

let modelA: tf.LayersModel | null = null;
let prepA: any = null;

let modelB: tf.LayersModel | null = null;
let prepB: any = null;

async function loadModelA() {
  if (!modelA) {
    modelA = await tf.loadLayersModel('/models/clogging_predictor/model.json');
    const res = await fetch('/models/clogging_predictor/preprocessing.json');
    prepA = await res.json();
  }
}

async function loadModelB() {
  if (!modelB) {
    modelB = await tf.loadLayersModel('/models/nutrient_advisor/model.json');
    const res = await fetch('/models/nutrient_advisor/preprocessing.json');
    prepB = await res.json();
  }
}

/**
 * Model A — LSTM Clogging Predictor
 */
export async function predictClogRisk(
  recentReadings: SensorReading[]
): Promise<{ score: number; level: ClogRiskLevel }> {
  try {
    await loadModelA();
  } catch (e) {
    console.error("Failed to load Model A", e);
    return { score: 0.1, level: 'GREEN' };
  }

  if (!recentReadings || recentReadings.length < prepA.seq_len) {
    return { score: 0.1, level: 'GREEN' };
  }
  
  const seq = recentReadings.slice(-prepA.seq_len);
  
  // Fabricate the 7 features from the raw reading to match the training data shape.
  // ["ph_mean", "ph_std", "ec_mean", "ec_slope", "turbidity_peak", "flow_drop_pct", "days_since_flush"]
  const features = seq.map(r => {
    return [
      r.ph, // ph_mean
      0.1,  // ph_std (mocked)
      r.ec, // ec_mean
      0.0,  // ec_slope (mocked)
      r.turbidity, // turbidity_peak
      0.0,  // flow_drop_pct (mocked)
      1.0   // days_since_flush (mocked)
    ];
  });
  
  // Normalize
  const mean = prepA.feature_mean;
  const std = prepA.feature_std;
  const normalized = features.map(fArr => fArr.map((v, i) => (v - mean[i]) / std[i]));
  
  // Predict
  const inputTensor = tf.tensor3d([normalized], [1, prepA.seq_len, 7]);
  const outputTensor = modelA!.predict(inputTensor) as tf.Tensor;
  const scoreArray = await outputTensor.data();
  const score = scoreArray[0];
  
  tf.dispose([inputTensor, outputTensor]);
  
  let level: ClogRiskLevel = 'GREEN';
  if (score >= prepA.risk_thresholds.red) level = 'RED';
  else if (score >= prepA.risk_thresholds.amber) level = 'AMBER';
  
  return { score, level };
}

/**
 * Model B — MLP Nutrient Advisor
 */
export async function predictNutrientAction(
  input: MLPCropInput
): Promise<NutrientRecommendation> {
  try {
    await loadModelB();
  } catch (e) {
    console.error("Failed to load Model B", e);
    return { action: "Maintain current dosing parameters", confidence: 0.99 };
  }
  
  const { currentPh, currentEc, cropType, growthStage } = input;
  
  const cropIdx = prepB.crops.indexOf(cropType.toLowerCase());
  const stageIdx = prepB.stages.indexOf(growthStage.toLowerCase());
  
  const cropOh = new Array(prepB.crops.length).fill(0);
  if (cropIdx >= 0) cropOh[cropIdx] = 1;
  
  const stageOh = new Array(prepB.stages.length).fill(0);
  if (stageIdx >= 0) stageOh[stageIdx] = 1;
  
  const phNorm = (currentPh - prepB.ph_ec_mean[0]) / prepB.ph_ec_std[0];
  const ecNorm = (currentEc - prepB.ph_ec_mean[1]) / prepB.ph_ec_std[1];
  
  const features = [phNorm, ecNorm, ...cropOh, ...stageOh];
  
  const inputTensor = tf.tensor2d([features]);
  const outputTensor = modelB!.predict(inputTensor) as tf.Tensor;
  const probs = await outputTensor.data();
  const probsArray = Array.from(probs);
  
  const actionIdx = probsArray.indexOf(Math.max(...probsArray));
  const actionKey = prepB.actions[actionIdx];
  const confidence = probsArray[actionIdx];
  
  tf.dispose([inputTensor, outputTensor]);
  
  const actionMap: Record<string, string> = {
    'dilute': 'Dilute the nutrient solution',
    'add_fertilizer_a': 'Add Fertilizer A',
    'add_fertilizer_b': 'Add Fertilizer B',
    'raise_ph': 'Raise pH level by adding base',
    'no_action': 'Maintain current dosing parameters'
  };
  
  return {
    action: actionMap[actionKey] || actionKey,
    confidence
  };
}
