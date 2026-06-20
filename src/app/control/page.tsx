"use client";

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { MOCK_NODE_IDS } from '@/hooks/useMockDataGenerator';
import { Power, Activity, Sliders, RefreshCw, CheckCircle2 } from 'lucide-react';
import { translations } from '@/services/translations';

function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function ControlPage() {
  const { state, dispatch } = useAppContext();
  const [selectedNode, setSelectedNode] = useState(MOCK_NODE_IDS[0]);
  const [flushState, setFlushState] = useState<'idle' | 'sending' | 'ack' | 'flushing' | 'done'>('idle');
  const [flushProgress, setFlushProgress] = useState(0);

  const t = translations[state.language || 'EN'];
  const node = state.nodes[selectedNode];

  // Flush State Machine simulator for Demo purposes (Optimistic UI + Command Acknowledgment)
  const handleFlushNow = () => {
    if (flushState !== 'idle') return;

    // 1. Sent command
    setFlushState('sending');

    setTimeout(() => {
      // 2. Acknowledge Received
      setFlushState('ack');
      dispatch({ type: 'TOGGLE_SOLENOID', payload: { nodeId: selectedNode, state: true } });

      setTimeout(() => {
        // 3. Flushing in progress
        setFlushState('flushing');
        setFlushProgress(0);
      }, 1500);

    }, 1500);
  };

  // Simulate progress bar during flushing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (flushState === 'flushing') {
      interval = setInterval(() => {
        setFlushProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setFlushState('done');
            dispatch({ type: 'TOGGLE_SOLENOID', payload: { nodeId: selectedNode, state: false } });
            
            // Auto reset back to idle after showing completed state
            setTimeout(() => {
              setFlushState('idle');
            }, 2000);

            return 100;
          }
          return prev + 10;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [flushState, selectedNode, dispatch]);

  const togglePump = (pumpKey: 'main' | 'dose_a' | 'dose_b' | 'dose_base') => {
    if (!node) return;
    dispatch({
      type: 'TOGGLE_PUMP',
      payload: {
        nodeId: selectedNode,
        pump: pumpKey,
        state: !node.pump_status[pumpKey],
      },
    });
  };

  const pendingFlush = state.pendingFlushes[selectedNode];

  const handleCancelFlush = () => {
    dispatch({ type: 'CANCEL_PENDING_FLUSH', payload: { nodeId: selectedNode } });
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 p-4 md:p-8 pb-24 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {t.controlPanel}
            </h1>
            <p className="text-neutral-400 text-sm mt-1">Manual Hardware Override & Flush Trigger</p>
          </div>
          {/* Language Toggle */}
          <button 
            onClick={() => dispatch({ type: 'SET_LANGUAGE', payload: state.language === 'EN' ? 'HI' : 'EN' })}
            className="px-4 py-2 rounded-full border border-neutral-800 bg-neutral-900 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            {state.language === 'EN' ? 'हिन्दी में बदलें' : 'Switch to English'}
          </button>
        </header>

        {/* Node Select Tab */}
        <section className="flex gap-2 overflow-x-auto py-2">
          {MOCK_NODE_IDS.map(nodeId => (
            <button
              key={nodeId}
              onClick={() => setSelectedNode(nodeId)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium border whitespace-nowrap transition-all",
                selectedNode === nodeId
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800"
              )}
            >
              {nodeId}
            </button>
          ))}
        </section>

        {/* Pending Auto-Flush Warning */}
        {pendingFlush && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-amber-400 font-semibold">{t.pendingFlushAlert}</p>
              <p className="text-xs text-neutral-400 mt-1">Triggered by: {pendingFlush.signals}</p>
            </div>
            <button
              onClick={handleCancelFlush}
              className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 transition-colors"
            >
              {t.cancelFlush}
            </button>
          </div>
        )}

        {node ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pump Toggles (2 Cols) */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Sliders className="w-5 h-5 text-emerald-400" /> Valve & Pump Controllers
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Main Pump */}
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{t.mainPump}</p>
                      <span className={cn("text-[10px] uppercase font-bold", node.pump_status.main ? "text-emerald-400" : "text-neutral-500")}>
                        {node.pump_status.main ? 'Running' : 'Stopped'}
                      </span>
                    </div>
                    <button 
                      onClick={() => togglePump('main')}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        node.pump_status.main ? "bg-emerald-500 text-neutral-950" : "bg-neutral-800 text-neutral-500 hover:bg-neutral-700"
                      )}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Dosing Pump A */}
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{t.dosingA}</p>
                      <span className={cn("text-[10px] uppercase font-bold", node.pump_status.dose_a ? "text-emerald-400" : "text-neutral-500")}>
                        {node.pump_status.dose_a ? 'Running' : 'Stopped'}
                      </span>
                    </div>
                    <button 
                      onClick={() => togglePump('dose_a')}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        node.pump_status.dose_a ? "bg-emerald-500 text-neutral-950" : "bg-neutral-800 text-neutral-500 hover:bg-neutral-700"
                      )}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Dosing Pump B */}
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{t.dosingB}</p>
                      <span className={cn("text-[10px] uppercase font-bold", node.pump_status.dose_b ? "text-emerald-400" : "text-neutral-500")}>
                        {node.pump_status.dose_b ? 'Running' : 'Stopped'}
                      </span>
                    </div>
                    <button 
                      onClick={() => togglePump('dose_b')}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        node.pump_status.dose_b ? "bg-emerald-500 text-neutral-950" : "bg-neutral-800 text-neutral-500 hover:bg-neutral-700"
                      )}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Acid Dosing Pump */}
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{t.acidDose}</p>
                      <span className={cn("text-[10px] uppercase font-bold", node.pump_status.dose_base ? "text-emerald-400" : "text-neutral-500")}>
                        {node.pump_status.dose_base ? 'Running' : 'Stopped'}
                      </span>
                    </div>
                    <button 
                      onClick={() => togglePump('dose_base')}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        node.pump_status.dose_base ? "bg-emerald-500 text-neutral-950" : "bg-neutral-800 text-neutral-500 hover:bg-neutral-700"
                      )}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Solenoid switch */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex justify-between items-center mt-4">
                  <div>
                    <p className="font-semibold text-sm">{t.solenoid}</p>
                    <span className={cn("text-[10px] uppercase font-bold", node.solenoid_status ? "text-emerald-400" : "text-neutral-500")}>
                      {node.solenoid_status ? 'Open (Flushing)' : 'Closed'}
                    </span>
                  </div>
                  <button 
                    onClick={() => dispatch({ type: 'TOGGLE_SOLENOID', payload: { nodeId: selectedNode, state: !node.solenoid_status } })}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                      node.solenoid_status ? "bg-rose-500 text-neutral-50" : "bg-neutral-800 text-neutral-500 hover:bg-neutral-700"
                    )}
                  >
                    <Activity className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Autonomous Flush Section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-rose-400" /> Flush Executive
                </h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Triggers immediate high-pressure pipeline flush to clear sediment/salts. Overrides active dosing sequences automatically.
                </p>

                {/* State Machine View */}
                <div className="py-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("w-3 h-3 rounded-full", flushState !== 'idle' ? "bg-emerald-500" : "bg-neutral-700")} />
                    <span className={cn("text-xs", flushState !== 'idle' ? "text-neutral-200" : "text-neutral-500")}>{t.sendingCommand}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("w-3 h-3 rounded-full", (flushState === 'ack' || flushState === 'flushing' || flushState === 'done') ? "bg-emerald-500" : "bg-neutral-700")} />
                    <span className={cn("text-xs", (flushState === 'ack' || flushState === 'flushing' || flushState === 'done') ? "text-neutral-200" : "text-neutral-500")}>{t.ackReceived}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("w-3 h-3 rounded-full", flushState === 'flushing' ? "bg-emerald-500 animate-ping" : (flushState === 'done' ? "bg-emerald-500" : "bg-neutral-700"))} />
                    <span className={cn("text-xs", (flushState === 'flushing' || flushState === 'done') ? "text-neutral-200" : "text-neutral-500")}>{t.flushingInProgress}</span>
                  </div>
                </div>

                {/* Flush Progress */}
                {flushState === 'flushing' && (
                  <div className="w-full bg-neutral-950 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${flushProgress}%` }}
                    />
                  </div>
                )}

                {flushState === 'done' && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <CheckCircle2 className="w-5 h-5" /> {t.flushCompleted}
                  </div>
                )}
              </div>

              <button
                onClick={handleFlushNow}
                disabled={flushState !== 'idle'}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold tracking-wider mt-6 transition-all shadow-lg",
                  flushState === 'idle'
                    ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-rose-500/10 hover:shadow-rose-500/20 active:scale-95"
                    : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                )}
              >
                {t.flushNow}
              </button>
            </div>
            
          </div>
        ) : (
          <div className="p-12 text-center text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-3xl animate-pulse">
            Loading Node Control...
          </div>
        )}
      </div>
    </main>
  );
}
