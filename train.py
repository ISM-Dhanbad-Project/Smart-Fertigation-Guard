import sys
from unittest.mock import MagicMock
sys.modules['tensorflow_decision_forests'] = MagicMock()
sys.modules['tensorflow_decision_forests.keras'] = MagicMock()

import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import json
import os
import shutil
import tensorflowjs as tfjs

np.random.seed(42)
tf.random.set_seed(42)

# --- MODEL A ---
SEQ_LEN = 7
N_FEATURES = 7
N_CYCLES_TOTAL = 1000

def simulate_field_trajectory(n_cycles):
    health = 1.0
    days_since_flush = 0
    rows = []
    clog_event_cycle = None

    for cycle in range(n_cycles):
        decay = np.random.uniform(0.01, 0.04) * (1 + (1 - health))
        health = max(0.0, health - decay)
        days_since_flush += 1

        flush_now = np.random.random() < 0.08 or health < 0.15
        if flush_now:
            health = min(1.0, health + np.random.uniform(0.7, 1.0))
            days_since_flush = 0

        ph_mean = 6.5 + (1 - health) * 0.8 + np.random.normal(0, 0.1)
        ph_std = 0.05 + (1 - health) * 0.15 + abs(np.random.normal(0, 0.02))
        ec_mean = 1.8 + (1 - health) * 1.2 + np.random.normal(0, 0.1)
        ec_slope = (1 - health) * 0.2 + np.random.normal(0, 0.05)
        turbidity_peak = (1 - health) * 150 + np.random.normal(0, 10)
        turbidity_peak = max(0, turbidity_peak)
        flow_drop_pct = (1 - health) * 25 + np.random.normal(0, 3)
        flow_drop_pct = max(0, flow_drop_pct)

        rows.append({
            "cycle": cycle,
            "ph_mean": ph_mean,
            "ph_std": ph_std,
            "ec_mean": ec_mean,
            "ec_slope": ec_slope,
            "turbidity_peak": turbidity_peak,
            "flow_drop_pct": flow_drop_pct,
            "days_since_flush": days_since_flush,
            "health": health,
        })

        if health < 0.15 and clog_event_cycle is None:
            clog_event_cycle = cycle

    return pd.DataFrame(rows), clog_event_cycle

def build_lstm_dataset(n_fields=150, cycles_per_field=40, seq_len=SEQ_LEN, horizon=4):
    feature_cols = ["ph_mean", "ph_std", "ec_mean", "ec_slope", "turbidity_peak", "flow_drop_pct", "days_since_flush"]
    X, y = [], []

    for _ in range(n_fields):
        df, _ = simulate_field_trajectory(cycles_per_field)
        for start in range(len(df) - seq_len - horizon):
            window = df.iloc[start:start + seq_len][feature_cols].values
            future_health = df.iloc[start + seq_len: start + seq_len + horizon]["health"].values
            label = 1 if (future_health < 0.15).any() else 0
            X.append(window)
            y.append(label)

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)

X_raw, y = build_lstm_dataset()
feature_mean = X_raw.reshape(-1, N_FEATURES).mean(axis=0)
feature_std = X_raw.reshape(-1, N_FEATURES).std(axis=0) + 1e-6
X_norm = (X_raw - feature_mean) / feature_std

split = int(0.85 * len(X_norm))
idx = np.random.permutation(len(X_norm))
train_idx, val_idx = idx[:split], idx[split:]
X_train, y_train = X_norm[train_idx], y[train_idx]
X_val, y_val = X_norm[val_idx], y[val_idx]

model_a = keras.Sequential([
    layers.Input(shape=(SEQ_LEN, N_FEATURES)),
    layers.LSTM(32, return_sequences=True),
    layers.LSTM(16),
    layers.Dense(1, activation="sigmoid"),
], name="clogging_predictor_lstm")

model_a.compile(
    optimizer=keras.optimizers.Adam(learning_rate=1e-3),
    loss="binary_crossentropy",
    metrics=["accuracy", keras.metrics.AUC(name="auc")],
)

model_a.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=10, # Reduced epochs for speed in generation
    batch_size=32,
    verbose=0,
)

# --- MODEL B ---
CROPS = ["tomato", "pomegranate", "grape", "chili", "onion", "cotton", "soybean", "wheat"]
STAGES = ["seedling", "vegetative", "flowering", "fruiting"]
ACTIONS = ["dilute", "add_fertilizer_a", "add_fertilizer_b", "raise_ph", "no_action"]

OPTIMAL_RANGES = {}
rng = np.random.default_rng(7)
for crop in CROPS:
    OPTIMAL_RANGES[crop] = {}
    base_ph = rng.uniform(5.8, 6.8)
    base_ec_low = rng.uniform(1.2, 1.8)
    for i, stage in enumerate(STAGES):
        stage_ec_shift = [0.0, 0.4, 0.7, 0.3][i]
        ph_low = base_ph - 0.3
        ph_high = base_ph + 0.3
        ec_low = base_ec_low + stage_ec_shift
        ec_high = ec_low + 0.6
        OPTIMAL_RANGES[crop][stage] = (ph_low, ph_high, ec_low, ec_high)

def label_for(ph, ec, crop, stage):
    ph_low, ph_high, ec_low, ec_high = OPTIMAL_RANGES[crop][stage]
    if ph < ph_low - 0.1: return "raise_ph"
    if ec > ec_high + 0.3: return "dilute"
    if ec < ec_low - 0.3: return "add_fertilizer_a" if ph >= (ph_low + ph_high) / 2 else "add_fertilizer_b"
    return "no_action"

def build_mlp_dataset(n_samples=6000):
    rows = []
    for _ in range(n_samples):
        crop = rng.choice(CROPS)
        stage = rng.choice(STAGES)
        ph_low, ph_high, ec_low, ec_high = OPTIMAL_RANGES[crop][stage]
        ph = rng.uniform(ph_low - 1.0, ph_high + 1.0)
        ec = rng.uniform(max(0.1, ec_low - 1.5), ec_high + 1.5)
        label = label_for(ph, ec, crop, stage)
        rows.append({"ph": ph, "ec": ec, "crop": crop, "stage": stage, "label": label})
    return pd.DataFrame(rows)

df_b = build_mlp_dataset()
crop_idx = {c: i for i, c in enumerate(CROPS)}
stage_idx = {s: i for i, s in enumerate(STAGES)}
action_idx = {a: i for i, a in enumerate(ACTIONS)}

def encode_row(row):
    crop_oh = np.eye(len(CROPS))[crop_idx[row["crop"]]]
    stage_oh = np.eye(len(STAGES))[stage_idx[row["stage"]]]
    return np.concatenate([[row["ph"], row["ec"]], crop_oh, stage_oh])

X_b = np.stack(df_b.apply(encode_row, axis=1).values).astype(np.float32)
y_b = df_b["label"].map(action_idx).values

ph_ec_mean = X_b[:, :2].mean(axis=0)
ph_ec_std = X_b[:, :2].std(axis=0) + 1e-6
X_b_norm = X_b.copy()
X_b_norm[:, :2] = (X_b[:, :2] - ph_ec_mean) / ph_ec_std

split_b = int(0.85 * len(X_b_norm))
idx_b = np.random.permutation(len(X_b_norm))
train_idx_b, val_idx_b = idx_b[:split_b], idx_b[split_b:]
X_train_b, y_train_b = X_b_norm[train_idx_b], y_b[train_idx_b]
X_val_b, y_val_b = X_b_norm[val_idx_b], y_b[val_idx_b]

INPUT_DIM_B = 2 + len(CROPS) + len(STAGES)
model_b = keras.Sequential([
    layers.Input(shape=(INPUT_DIM_B,)),
    layers.Dense(32, activation="relu"),
    layers.Dense(16, activation="relu"),
    layers.Dense(len(ACTIONS), activation="softmax"),
], name="nutrient_advisor_mlp")

model_b.compile(
    optimizer=keras.optimizers.Adam(learning_rate=1e-3),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)

model_b.fit(
    X_train_b, y_train_b,
    validation_data=(X_val_b, y_val_b),
    epochs=15, # Reduced for speed
    batch_size=32,
    verbose=0,
)

# --- EXPORT ---
os.makedirs("model_a_tfjs", exist_ok=True)
os.makedirs("model_b_tfjs", exist_ok=True)

tfjs.converters.save_keras_model(model_a, "model_a_tfjs")
tfjs.converters.save_keras_model(model_b, "model_b_tfjs")

with open("model_a_tfjs/preprocessing.json", "w") as f:
    json.dump({
        "feature_order": ["ph_mean", "ph_std", "ec_mean", "ec_slope", "turbidity_peak", "flow_drop_pct", "days_since_flush"],
        "feature_mean": feature_mean.tolist(),
        "feature_std": feature_std.tolist(),
        "seq_len": SEQ_LEN,
        "risk_thresholds": {"red": 0.65, "amber": 0.35},
    }, f, indent=2)

with open("model_b_tfjs/preprocessing.json", "w") as f:
    json.dump({
        "crops": CROPS,
        "stages": STAGES,
        "actions": ACTIONS,
        "ph_ec_mean": ph_ec_mean.tolist(),
        "ph_ec_std": ph_ec_std.tolist(),
        "input_order": "ph, ec, crop_onehot(8), stage_onehot(4)",
    }, f, indent=2)

# Move models to Next.js public directory
target_dir_a = os.path.join(os.getcwd(), 'fertigation-guard', 'public', 'models', 'clogging_predictor')
target_dir_b = os.path.join(os.getcwd(), 'fertigation-guard', 'public', 'models', 'nutrient_advisor')

if os.path.exists(target_dir_a): shutil.rmtree(target_dir_a)
if os.path.exists(target_dir_b): shutil.rmtree(target_dir_b)

shutil.move("model_a_tfjs", target_dir_a)
shutil.move("model_b_tfjs", target_dir_b)

print("Models successfully generated and moved to public/models/")
