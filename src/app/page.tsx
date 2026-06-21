"use client";

import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useMockDataGenerator, MOCK_NODE_IDS } from '@/hooks/useMockDataGenerator';
import { Activity, Droplets, Gauge as GaugeIcon, Battery, RefreshCw, AlertTriangle, MoreVertical, Power } from 'lucide-react';
import { translations } from '@/services/translations';
import { PressureGauge } from '@/components/PressureGauge';
import Link from 'next/link';

function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function Home() {
  useMockDataGenerator(3000);
  const { state, dispatch } = useAppContext();
  const [selectedNode, setSelectedNode] = useState(MOCK_NODE_IDS[0]);

  const t = translations[state.language || 'EN'];
  const mainNodeData = state.nodes[selectedNode];
  const mainNodeRisk = state.clogRisk[selectedNode] || { level: 'GREEN', score: 0 };

  const getRiskIcon = (level: string) => {
    switch(level) {
      case 'RED': return <AlertTriangle className="w-4 h-4 text-white" />;
      case 'AMBER': return <div className="w-3 h-3 bg-white rotate-45" />; // Diamond
      default: return <div className="w-3 h-3 bg-white rounded-full" />; // Circle
    }
  }

  return (
    <main className="min-h-screen bg-base text-ink pb-24 font-body">
      {/* Top Banner for Alerts/Status */}
      <div className="bg-ink text-base px-4 py-2 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <span className={cn("w-3 h-3 rounded-full", state.isOnline ? "bg-[#15B79E]" : "bg-[#D92D20]")}></span>
          <span className="font-display font-bold text-sm tracking-wider uppercase">{state.isOnline ? t.online : t.offline}</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => dispatch({ type: 'SET_LANGUAGE', payload: state.language === 'EN' ? 'HI' : 'EN' })}
            className="px-3 py-1 border border-base/30 rounded font-bold text-sm hover:bg-base/10 transition-colors"
          >
            {state.language === 'EN' ? 'HI' : 'EN'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">

        {/* Global Pending Flush Alert Banner */}
        {Object.keys(state.pendingFlushes).map(nodeId => {
          return (
            <div key={nodeId} className="p-4 bg-[#DC6803] text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 shrink-0" />
                <div>
                  <p className="font-bold text-lg uppercase tracking-wider">{t.pendingFlushAlert} ({nodeId})</p>
                </div>
              </div>
              <button
                onClick={() => dispatch({ type: 'CANCEL_PENDING_FLUSH', payload: { nodeId } })}
                className="px-6 py-3 bg-ink text-base font-bold text-lg hover:bg-ink/90 active:scale-95 transition-all w-full sm:w-auto"
              >
                {t.cancelFlush}
              </button>
            </div>
          );
        })}

        {/* INSTRUMENT CLUSTER (Signature Element) */}
        {mainNodeData ? (
          <section className="bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-6 rounded-none">
            <div className="text-center mb-2">
              <h1 className="font-display font-bold text-2xl uppercase tracking-widest">{selectedNode} SYSTEM PRESSURE</h1>
              <div className="flex justify-center items-center gap-2 mt-2">
                <span className={cn(
                  "flex items-center gap-2 px-3 py-1 font-bold text-sm uppercase tracking-widest",
                  mainNodeRisk.level === 'GREEN' ? "bg-[#15B79E] text-white" :
                  mainNodeRisk.level === 'AMBER' ? "bg-[#DC6803] text-white" :
                  "bg-[#D92D20] text-white"
                )}>
                  {getRiskIcon(mainNodeRisk.level)}
                  RISK: {mainNodeRisk.level}
                </span>
              </div>
            </div>

            <div className="my-6">
              <PressureGauge pressure={mainNodeData.pressure} riskLevel={mainNodeRisk.level as any} />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t-2 border-ink pt-6">
              <div className="flex flex-col items-center justify-center p-4 bg-base border-2 border-ink">
                <Droplets className="w-8 h-8 text-accent mb-2" />
                <span className="font-display text-3xl font-bold">{mainNodeData.flow_rate.toFixed(1)}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-ink/70">Flow (L/h)</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-base border-2 border-ink">
                <Activity className="w-8 h-8 text-ink mb-2" />
                <span className="font-display text-3xl font-bold">{mainNodeData.ec.toFixed(2)}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-ink/70">EC (mS/cm)</span>
              </div>
            </div>

            <div className="mt-4 p-4 bg-ink text-base flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <Power className={cn("w-6 h-6", mainNodeData.pump_status.main ? "text-[#15B79E] animate-pulse" : "text-base/50")} />
                  <span className="font-bold text-lg uppercase tracking-wider">Pump: {mainNodeData.pump_status.main ? 'ON' : 'OFF'}</span>
               </div>
               <Link href="/control">
                 <button className="px-4 py-2 bg-accent text-white font-bold tracking-wider hover:bg-accent/90 active:translate-y-1">
                   CONTROL PANEL
                 </button>
               </Link>
            </div>
          </section>
        ) : (
          <div className="h-64 flex items-center justify-center bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
            Loading Instrument Cluster...
          </div>
        )}

        {/* MULTI-ZONE GRID (Expanded Cards) */}
        <section>
          <div className="bg-ink text-base px-4 py-3 border-2 border-ink border-b-0 flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] translate-y-[4px]">
            <h2 className="font-display font-bold text-lg uppercase tracking-widest">{t.activeZones}</h2>
            {/* Anomaly trigger for testing */}
            <select
                value={state.forceAnomalyNode || ''}
                onChange={(e) => dispatch({ type: 'TOGGLE_ANOMALY', payload: { nodeId: e.target.value || null, forceFailure: state.forceFlushFailure } })}
                className="bg-base text-ink text-xs font-bold p-1 outline-none border-2 border-ink"
              >
                <option value="">No Anomaly Test</option>
                {MOCK_NODE_IDS.map(id => <option key={id} value={id}>Test Clog: {id}</option>)}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            {MOCK_NODE_IDS.map(nodeId => {
              const data = state.nodes[nodeId];
              const risk = state.clogRisk[nodeId] || { level: 'GREEN' };
              const hasAlert = !!state.alerts[nodeId];

              if (!data) return <div key={nodeId} className="p-4 bg-base border-2 border-ink animate-pulse h-32"></div>;

              return (
                <div 
                  key={nodeId}
                  onClick={() => setSelectedNode(nodeId)}
                  className={cn(
                    "bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] cursor-pointer transition-transform hover:-translate-y-1 active:translate-y-1 active:shadow-none p-4",
                    selectedNode === nodeId ? "ring-4 ring-ink ring-inset" : "",
                    hasAlert ? "bg-[#D92D20]/10" : ""
                  )}
                >
                  <div className="flex justify-between items-start mb-4 border-b-2 border-ink pb-3">
                    <span className="font-display font-bold text-2xl uppercase tracking-widest">{nodeId}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "flex items-center gap-2 px-3 py-1 font-bold text-sm uppercase tracking-widest border-2 border-ink",
                        risk.level === 'GREEN' ? "bg-[#15B79E] text-white" :
                        risk.level === 'AMBER' ? "bg-[#DC6803] text-white" :
                        "bg-[#D92D20] text-white"
                      )}>
                        {getRiskIcon(risk.level)}
                        {risk.level}
                      </span>
                      <Link href="/control" onClick={(e) => e.stopPropagation()}>
                         <button className="p-1 border-2 border-ink bg-white hover:bg-base active:bg-ink active:text-base transition-colors">
                           <MoreVertical className="w-5 h-5" />
                         </button>
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-ink/70">Pressure</span>
                      <span className="font-display font-bold text-2xl">{data.pressure}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-ink/70">Flow (L/h)</span>
                      <span className="font-display font-bold text-2xl">{data.flow_rate.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-ink/70">pH</span>
                      <span className="font-display font-bold text-2xl">{data.ph.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-ink/70">EC (mS/cm)</span>
                      <span className="font-display font-bold text-2xl">{data.ec.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-ink/70">Turbidity</span>
                      <span className="font-display font-bold text-2xl">{data.turbidity}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </main>
  );
}
