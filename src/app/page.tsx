"use client";

import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useMockDataGenerator, MOCK_NODE_IDS } from '@/hooks/useMockDataGenerator';
import { Activity, Droplets, Gauge as GaugeIcon, Battery, Power } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

function NodeCard({ nodeId, isSelected, onClick }: { nodeId: string; isSelected: boolean; onClick: () => void }) {
  const { state } = useAppContext();
  const data = state.nodes[nodeId];
  const risk = state.clogRisk[nodeId] || { level: 'GREEN', score: 0 };

  if (!data) return <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse h-32"></div>;

  const riskColors = {
    GREEN: 'text-emerald-400',
    AMBER: 'text-amber-400',
    RED: 'text-rose-500'
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "cursor-pointer p-5 rounded-2xl border transition-all duration-300",
        isSelected 
          ? "bg-neutral-800/80 border-emerald-500/50 shadow-lg shadow-emerald-500/10" 
          : "bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-lg text-neutral-100">{nodeId}</h3>
        <div className="flex items-center gap-2">
          <Battery className={cn("w-4 h-4", data.battery_pct > 20 ? "text-emerald-500" : "text-rose-500")} />
          <span className="text-xs text-neutral-400">{data.battery_pct}%</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-neutral-500 mb-1">pH Level</p>
          <p className="font-medium">{data.ph}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">EC (mS/cm)</p>
          <p className="font-medium">{data.ec}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Clog Risk</p>
          <p className={cn("font-medium", riskColors[risk.level])}>{risk.level}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Pump</p>
          <p className="font-medium flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-full", data.pump_status.main ? "bg-emerald-500" : "bg-neutral-600")}></span>
            {data.pump_status.main ? 'ON' : 'OFF'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  useMockDataGenerator(3000);
  const { state, dispatch } = useAppContext();
  const [selectedNode, setSelectedNode] = useState(MOCK_NODE_IDS[0]);

  const toggleAnomaly = () => {
    dispatch({ type: 'TOGGLE_ANOMALY', payload: !state.forceAnomaly });
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 p-4 md:p-8 font-sans selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Fertigation Guard
            </h1>
            <p className="text-neutral-400 text-sm mt-1">Smart pH-EC Monitoring & Autonomous Flush</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleAnomaly}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                state.forceAnomaly 
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30" 
                  : "bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700"
              )}
            >
              {state.forceAnomaly ? 'Stop Anomaly' : 'Trigger Anomaly'}
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800">
              <span className={cn("w-2.5 h-2.5 rounded-full", state.isOnline ? "bg-emerald-500" : "bg-rose-500")}></span>
              <span className="text-xs font-medium">{state.isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </header>

        {/* Zones Grid */}
        <section>
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">Active Zones</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MOCK_NODE_IDS.map(nodeId => (
              <NodeCard 
                key={nodeId} 
                nodeId={nodeId} 
                isSelected={selectedNode === nodeId}
                onClick={() => setSelectedNode(nodeId)}
              />
            ))}
          </div>
        </section>

        {/* Selected Zone Dashboard */}
        {selectedNode && state.nodes[selectedNode] && (
          <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold tracking-tight">{selectedNode} Overview</h2>
              {/* Clogging Risk Banner */}
              <div className="px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                <span className="text-sm text-neutral-400">Risk Level</span>
                <span className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold tracking-wide uppercase",
                  (state.clogRisk[selectedNode]?.level || 'GREEN') === 'GREEN' ? "bg-emerald-500/20 text-emerald-400" :
                  (state.clogRisk[selectedNode]?.level === 'AMBER') ? "bg-amber-500/20 text-amber-400" :
                  "bg-rose-500/20 text-rose-500"
                )}>
                  {state.clogRisk[selectedNode]?.level || 'GREEN'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {/* Values - we will build gauge components here shortly */}
               <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center text-center">
                  <Activity className="w-6 h-6 text-emerald-500 mb-3" />
                  <p className="text-4xl font-light tabular-nums">{state.nodes[selectedNode].ph}</p>
                  <p className="text-sm text-neutral-500 mt-1">pH Level</p>
               </div>
               <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center text-center">
                  <Activity className="w-6 h-6 text-cyan-500 mb-3" />
                  <p className="text-4xl font-light tabular-nums">{state.nodes[selectedNode].ec}</p>
                  <p className="text-sm text-neutral-500 mt-1">EC (mS/cm)</p>
               </div>
               <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center text-center">
                  <Droplets className="w-6 h-6 text-blue-500 mb-3" />
                  <p className="text-4xl font-light tabular-nums">{state.nodes[selectedNode].flow_rate}</p>
                  <p className="text-sm text-neutral-500 mt-1">Flow (L/min)</p>
               </div>
               <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center text-center">
                  <GaugeIcon className="w-6 h-6 text-amber-500 mb-3" />
                  <p className="text-4xl font-light tabular-nums">{state.nodes[selectedNode].pressure}</p>
                  <p className="text-sm text-neutral-500 mt-1">Pressure (kPa)</p>
               </div>
            </div>

            {/* Control Panel stub */}
            <div className="mt-8 p-6 rounded-2xl bg-neutral-950 border border-neutral-800">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Power className="w-5 h-5 text-emerald-500" /> Control Panel
              </h3>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => dispatch({ type: 'TOGGLE_PUMP', payload: { nodeId: selectedNode, pump: 'main', state: !state.nodes[selectedNode].pump_status.main } })}
                  className={cn("px-6 py-3 rounded-xl font-medium transition-all", state.nodes[selectedNode].pump_status.main ? "bg-emerald-500 text-neutral-950" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700")}
                >
                  Main Pump: {state.nodes[selectedNode].pump_status.main ? 'ON' : 'OFF'}
                </button>
                <button 
                  className="px-6 py-3 rounded-xl font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-all"
                >
                  Dosing A
                </button>
                <button 
                  className="px-6 py-3 rounded-xl font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-all"
                >
                  Dosing B
                </button>
                <button 
                  className="px-6 py-3 rounded-xl font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-all"
                >
                  Acid Dose
                </button>
                <div className="flex-1"></div>
                <button 
                  className="px-6 py-3 rounded-xl font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 transition-all"
                >
                  FLUSH NOW
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
