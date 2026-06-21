"use client";

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { MOCK_NODE_IDS } from '@/hooks/useMockDataGenerator';
import { Power, ArrowLeft, RefreshCw, AlertTriangle, Droplet } from 'lucide-react';
import { translations } from '@/services/translations';
import Link from 'next/link';

function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function ControlPage() {
  const { state, dispatch } = useAppContext();
  const [selectedNode, setSelectedNode] = useState(MOCK_NODE_IDS[0]);
  const [flushState, setFlushState] = useState<'idle' | 'sending' | 'ack' | 'flushing' | 'done'>('idle');
  const [flushProgress, setFlushProgress] = useState(0);

  const [timeLeft, setTimeLeft] = useState('');

  const t = translations[state.language || 'EN'];
  const node = state.nodes[selectedNode];
  const pendingFlush = state.pendingFlushes[selectedNode];
  const alertMsg = state.alerts[selectedNode];

  const handleFlushNow = React.useCallback(() => {
    if (flushState !== 'idle') return;

    setFlushState('sending');
    setTimeout(() => {
      setFlushState('ack');
      dispatch({ type: 'TOGGLE_SOLENOID', payload: { nodeId: selectedNode, state: true } });

      setTimeout(() => {
        setFlushState('flushing');
        setFlushProgress(0);
      }, 1000);
    }, 1000);
  }, [flushState, dispatch, selectedNode]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (flushState === 'flushing') {
      interval = setInterval(() => {
        setFlushProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setFlushState('done');
            dispatch({ type: 'TOGGLE_SOLENOID', payload: { nodeId: selectedNode, state: false } });
            dispatch({ type: 'FLUSH_COMPLETED', payload: { nodeId: selectedNode } });
            
            if (state.forceAnomalyNode === selectedNode && !state.forceFlushFailure) {
              dispatch({ type: 'TOGGLE_ANOMALY', payload: { nodeId: null, forceFailure: state.forceFlushFailure } });
            }

            setTimeout(() => setFlushState('idle'), 2000);
            return 100;
          }
          return prev + 10;
        });
      }, 300);
    }
    return () => clearInterval(interval);
  }, [flushState, selectedNode, dispatch, state.forceAnomalyNode, state.forceFlushFailure]);

  useEffect(() => {
    if (!pendingFlush) {
      setTimeLeft('');
      return;
    }
    const tick = () => {
      const remaining = pendingFlush.expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeLeft('00:00');
        if (flushState === 'idle') {
          dispatch({ type: 'DISMISS_PENDING_FLUSH', payload: { nodeId: selectedNode } });
          handleFlushNow();
        }
      } else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [pendingFlush, flushState, dispatch, selectedNode]);

  const togglePump = (pumpKey: 'main' | 'dose_a' | 'dose_b' | 'dose_base') => {
    if (!node) return;
    dispatch({
      type: 'TOGGLE_PUMP',
      payload: { nodeId: selectedNode, pump: pumpKey, state: !node.pump_status[pumpKey] },
    });
  };

  return (
    <main className="min-h-screen bg-base text-ink pb-24 font-body">
      {/* Top Header */}
      <div className="bg-ink text-base px-4 py-4 shadow-md flex items-center gap-4">
        <Link href="/">
          <button className="p-2 border-2 border-base hover:bg-base hover:text-ink transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </Link>
        <h1 className="font-display font-bold text-2xl uppercase tracking-widest">{t.controlPanel}</h1>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Node Select List (Massive touch targets) */}
        <section className="flex overflow-x-auto border-2 border-ink bg-white">
          {MOCK_NODE_IDS.map(nodeId => (
            <button
              key={nodeId}
              onClick={() => setSelectedNode(nodeId)}
              className={cn(
                "flex-1 px-6 py-4 font-display font-bold text-lg border-r-2 border-ink last:border-r-0 whitespace-nowrap transition-colors",
                selectedNode === nodeId
                  ? "bg-accent text-white"
                  : "bg-white hover:bg-base"
              )}
            >
              {nodeId}
            </button>
          ))}
        </section>

        {/* Alerts */}
        {pendingFlush && (
          <div className="p-4 bg-[#DC6803] text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8" />
              <div>
                <p className="font-bold text-lg uppercase tracking-wider">
                  {t.pendingFlushAlert} (AUTO: {timeLeft})
                </p>
              </div>
            </div>
            <button
              onClick={() => dispatch({ type: 'CANCEL_PENDING_FLUSH', payload: { nodeId: selectedNode } })}
              className="px-6 py-3 bg-ink text-base font-bold text-lg hover:bg-ink/90 active:scale-95 transition-all w-full md:w-auto"
            >
              {t.cancelFlush}
            </button>
          </div>
        )}

        {alertMsg && (
          <div className="p-4 bg-[#D92D20] text-white shadow-md flex justify-between items-center gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8" />
              <p className="font-bold text-lg uppercase tracking-wider">{alertMsg}</p>
            </div>
            <button
              onClick={() => dispatch({ type: 'DISMISS_ALERT', payload: { nodeId: selectedNode } })}
              className="px-6 py-3 bg-white text-[#D92D20] font-bold text-lg border-2 border-[#D92D20] hover:bg-white/90"
            >
              DISMISS
            </button>
          </div>
        )}

        {node ? (
          <div className="space-y-6">
            
            {/* MASSIVE FLUSH BUTTON */}
            <div className="bg-white border-2 border-ink p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <h2 className="font-display font-bold text-xl uppercase tracking-widest border-b-2 border-ink pb-2 mb-4">
                SYSTEM FLUSH OVERRIDE
              </h2>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 bg-base border-2 border-ink p-4 text-center">
                  <div className="font-display text-sm font-bold uppercase text-ink/70">Solenoid Valve</div>
                  <div className={cn("font-display text-2xl font-bold uppercase", node.solenoid_status ? "text-[#D92D20]" : "text-[#15B79E]")}>
                    {node.solenoid_status ? 'OPEN' : 'CLOSED'}
                  </div>
                </div>
                <div className="flex-1 bg-base border-2 border-ink p-4 text-center">
                  <div className="font-display text-sm font-bold uppercase text-ink/70">Pressure</div>
                  <div className="font-display text-2xl font-bold uppercase">{node.pressure} kPa</div>
                </div>
              </div>

              {flushState === 'flushing' && (
                <div className="w-full bg-base border-2 border-ink h-8 mb-6 relative overflow-hidden">
                  <div 
                    className="bg-accent h-full transition-all duration-300" 
                    style={{ width: `${flushProgress}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-white mix-blend-difference uppercase">
                    FLUSHING... {flushProgress}%
                  </span>
                </div>
              )}

              <button
                onClick={handleFlushNow}
                disabled={flushState !== 'idle'}
                className={cn(
                  "w-full py-8 text-3xl font-display font-bold uppercase tracking-widest border-4 transition-all flex items-center justify-center gap-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]",
                  flushState === 'idle'
                    ? "bg-[#D92D20] border-ink text-white hover:bg-[#D92D20]/90 active:translate-y-1 active:shadow-none"
                    : "bg-base border-ink/50 text-ink/50 cursor-not-allowed shadow-none"
                )}
              >
                <Droplet className={cn("w-10 h-10", flushState !== 'idle' && "animate-bounce")} />
                {t.flushNow}
              </button>
            </div>

            {/* PUMP TOGGLES (Large switches) */}
            <div className="bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <h2 className="font-display font-bold text-xl uppercase tracking-widest bg-ink text-base px-6 py-3 border-b-2 border-ink">
                PUMP CONTROLS
              </h2>
              
              <div className="divide-y-2 divide-ink">
                {[
                  { key: 'main', label: t.mainPump, icon: <Power className="w-8 h-8" /> },
                  { key: 'dose_a', label: t.dosingA, icon: <RefreshCw className="w-8 h-8" /> },
                  { key: 'dose_b', label: t.dosingB, icon: <RefreshCw className="w-8 h-8" /> },
                  { key: 'dose_base', label: t.acidDose, icon: <AlertTriangle className="w-8 h-8" /> },
                ].map((pump) => {
                  const isActive = node.pump_status[pump.key as keyof typeof node.pump_status];
                  return (
                    <div key={pump.key} className="flex justify-between items-center p-4 hover:bg-base transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-16 h-16 flex items-center justify-center border-2 border-ink",
                          isActive ? "bg-[#15B79E] text-white" : "bg-white text-ink/50"
                        )}>
                          {pump.icon}
                        </div>
                        <div>
                          <div className="font-display font-bold text-xl uppercase tracking-widest">{pump.label}</div>
                          <div className={cn("font-bold text-sm uppercase", isActive ? "text-[#15B79E]" : "text-ink/50")}>
                            {isActive ? 'POWER ON' : 'POWER OFF'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Massive Toggle Button */}
                      <button 
                        onClick={() => togglePump(pump.key as any)}
                        className={cn(
                          "w-24 h-16 border-2 border-ink relative transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-y-1 active:shadow-none rounded-full overflow-hidden",
                          isActive ? "bg-[#15B79E]" : "bg-base"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-12 h-12 border-2 border-ink bg-white transition-all rounded-full",
                          isActive ? "left-[2.2rem]" : "left-1"
                        )} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        ) : (
          <div className="p-12 text-center text-ink bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] animate-pulse font-display font-bold text-xl uppercase tracking-widest">
            LOADING CONTROLS...
          </div>
        )}
      </div>
    </main>
  );
}
