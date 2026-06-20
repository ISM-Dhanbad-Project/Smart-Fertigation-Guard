"use client";

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useMockDataGenerator, MOCK_NODE_IDS } from '@/hooks/useMockDataGenerator';
import { Activity, Droplets, Gauge as GaugeIcon, Battery, RefreshCw, AlertTriangle, Scale, PlusCircle } from 'lucide-react';
import { translations } from '@/services/translations';
import { HarvestLog } from '@/types';
import { saveHarvestLog, getAllHarvestLogs } from '@/services/db';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}

// Sunlight-legible status indicator colors
const riskColors = {
  GREEN: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/30',
  AMBER: 'text-amber-400 bg-amber-400/10 border border-amber-400/30',
  RED: 'text-rose-400 bg-rose-400/10 border border-rose-400/30'
};

function NodeCard({ nodeId, isSelected, onClick }: { nodeId: string; isSelected: boolean; onClick: () => void }) {
  const { state } = useAppContext();
  const data = state.nodes[nodeId];
  const risk = state.clogRisk[nodeId] || { level: 'GREEN', score: 0 };
  const t = translations[state.language || 'EN'];

  if (!data) return <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 animate-pulse h-40"></div>;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "cursor-pointer p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between",
        isSelected 
          ? "bg-neutral-900 border-emerald-500 shadow-xl shadow-emerald-500/5 ring-1 ring-emerald-500/20" 
          : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
      )}
    >
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-white tracking-wider">{nodeId}</h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-950 border border-neutral-800">
            <Battery className={cn("w-3.5 h-3.5", data.battery_pct > 20 ? "text-emerald-400" : "text-rose-400")} />
            <span className="text-[10px] font-bold text-neutral-300">{data.battery_pct}%</span>
          </div>
        </div>
        
        {/* Full parameter list (spec required: pH, EC, flow, turbidity, pressure, battery, statuses) */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
          <div>
            <p className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider mb-0.5">{t.phLevel}</p>
            <p className="font-bold text-neutral-100 text-sm">{data.ph.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider mb-0.5">{t.ec}</p>
            <p className="font-bold text-neutral-100 text-sm">{data.ec.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider mb-0.5">Flow (L/min)</p>
            <p className="font-bold text-neutral-100 text-sm">{data.flow_rate.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider mb-0.5">Turbidity (NTU)</p>
            <p className="font-bold text-neutral-100 text-sm">{data.turbidity}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider mb-0.5">Pressure (kPa)</p>
            <p className="font-bold text-neutral-100 text-sm">{data.pressure}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider mb-0.5">Status</p>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", data.pump_status.main ? "bg-emerald-500/10 text-emerald-400" : "bg-neutral-800 text-neutral-500")}>
              Pump: {data.pump_status.main ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center border-t border-neutral-800 pt-3 mt-1">
        <span className={cn("text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider", riskColors[risk.level as keyof typeof riskColors])}>
          Clog: {risk.level}
        </span>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", data.solenoid_status ? "text-rose-400 bg-rose-400/10 border-rose-400/30" : "text-neutral-500 bg-neutral-950 border-neutral-800")}>
          Solenoid: {data.solenoid_status ? 'OPEN' : 'CLOSED'}
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  useMockDataGenerator(3000);
  const { state, dispatch } = useAppContext();
  const [selectedNode, setSelectedNode] = useState(MOCK_NODE_IDS[0]);
  const [harvests, setHarvests] = useState<HarvestLog[]>([]);
  
  // Harvest log form state
  const [cropType, setCropType] = useState('tomato');
  const [yieldAmount, setYieldAmount] = useState('');
  const [avgEc, setAvgEc] = useState('1.5');
  const [notes, setNotes] = useState('');

  const t = translations[state.language || 'EN'];

  // Load Harvest Logs
  useEffect(() => {
    async function loadHarvests() {
      const logs = await getAllHarvestLogs();
      if (logs.length === 0) {
        // Populate mock historical harvest data for high-quality demo visualizations
        const mockHarvests: HarvestLog[] = [
          { id: '1', nodeId: 'Zone-Alpha', timestamp: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), cropType: 'tomato', yieldKg: 245, avgEc: 1.4, notes: 'Healthy growth, clean lines' },
          { id: '2', nodeId: 'Zone-Beta', timestamp: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(), cropType: 'capsicum', yieldKg: 180, avgEc: 1.6, notes: 'Slight scale clogging early' },
          { id: '3', nodeId: 'Zone-Gamma', timestamp: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(), cropType: 'tomato', yieldKg: 310, avgEc: 1.8, notes: 'Ideal pH-EC balance maintained' },
          { id: '4', nodeId: 'Zone-Alpha', timestamp: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(), cropType: 'cucumber', yieldKg: 420, avgEc: 2.1, notes: 'High yield flush cycle' },
          { id: '5', nodeId: 'Zone-Beta', timestamp: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), cropType: 'tomato', yieldKg: 150, avgEc: 1.1, notes: 'Under-fertilized test run' },
        ];
        for (const log of mockHarvests) {
          await saveHarvestLog(log);
        }
        setHarvests(mockHarvests);
      } else {
        setHarvests(logs);
      }
    }
    loadHarvests();
  }, []);

  const handleAddHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yieldAmount || !avgEc) return;

    const newLog: HarvestLog = {
      id: Math.random().toString(36).substr(2, 9),
      nodeId: selectedNode,
      timestamp: new Date().toISOString(),
      cropType,
      yieldKg: parseFloat(yieldAmount),
      avgEc: parseFloat(avgEc),
      notes
    };

    await saveHarvestLog(newLog);
    setHarvests(prev => [...prev, newLog]);
    setYieldAmount('');
    setNotes('');
  };

  const toggleAnomaly = () => {
    dispatch({ type: 'TOGGLE_ANOMALY', payload: !state.forceAnomaly });
  };

  const selectedNodeReading = state.nodes[selectedNode];

  // Prepare chart data: sorted by date
  const chartData = harvests
    .filter(h => h.nodeId === selectedNode)
    .map(h => ({
      date: new Date(h.timestamp).toLocaleDateString(state.language === 'EN' ? 'en-US' : 'hi-IN', { month: 'short', day: 'numeric' }),
      yield: h.yieldKg,
      ec: h.avgEc
    }));

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 p-4 md:p-8 pb-24 font-sans selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Fertigation Guard
            </h1>
            <p className="text-neutral-400 text-sm mt-1">Smart pH-EC Monitoring & Autonomous Flush</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleAnomaly}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                state.forceAnomaly 
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-lg shadow-rose-500/10" 
                  : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800"
              )}
            >
              {state.forceAnomaly ? t.stopAnomaly : t.triggerAnomaly}
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className={cn("w-2.5 h-2.5 rounded-full", state.isOnline ? "bg-emerald-500" : "bg-rose-500")}></span>
              <span className="text-xs font-bold">{state.isOnline ? t.online : t.offline}</span>
            </div>
            {/* Language Toggle */}
            <button 
              onClick={() => dispatch({ type: 'SET_LANGUAGE', payload: state.language === 'EN' ? 'HI' : 'EN' })}
              className="px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900 text-xs font-bold text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              {state.language === 'EN' ? 'HI' : 'EN'}
            </button>
          </div>
        </header>

        {/* Global Pending Flush Alert Banner */}
        {Object.keys(state.pendingFlushes).map(nodeId => {
          const pf = state.pendingFlushes[nodeId];
          return (
            <div key={nodeId} className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 font-semibold text-sm">{t.pendingFlushAlert} ({nodeId})</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Signals: {pf.signals}</p>
                </div>
              </div>
              <button
                onClick={() => dispatch({ type: 'CANCEL_PENDING_FLUSH', payload: { nodeId } })}
                className="px-4 py-2 rounded-2xl bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 transition-colors"
              >
                {t.cancelFlush}
              </button>
            </div>
          );
        })}

        {/* Multi-Zone Dashboard Grid */}
        <section>
          <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">{t.activeZones}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* Selected Zone Dashboard details & gauges */}
        {selectedNode && selectedNodeReading && (
          <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold tracking-tight text-white">{selectedNode} {t.zoneOverview}</h2>
              <div className="px-4 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                <span className="text-xs text-neutral-400 font-medium">{t.riskLevel}</span>
                <span className={cn(
                  "px-3 py-1 rounded-lg text-xs font-extrabold tracking-wider uppercase",
                  (state.clogRisk[selectedNode]?.level || 'GREEN') === 'GREEN' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" :
                  (state.clogRisk[selectedNode]?.level === 'AMBER') ? "bg-amber-500/20 text-amber-400 border border-amber-500/20" :
                  "bg-rose-500/20 text-rose-400 border border-rose-500/20"
                )}>
                  {state.clogRisk[selectedNode]?.level || 'GREEN'}
                </span>
              </div>
            </div>

            {/* Dials / Gauges Motifs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex flex-col items-center justify-center text-center">
                <Activity className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="text-3xl font-extrabold text-white tracking-tight">{selectedNodeReading.ph.toFixed(1)}</p>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-1">{t.phLevel}</p>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex flex-col items-center justify-center text-center">
                <Activity className="w-5 h-5 text-cyan-400 mb-2" />
                <p className="text-3xl font-extrabold text-white tracking-tight">{selectedNodeReading.ec.toFixed(2)}</p>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-1">{t.ec}</p>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex flex-col items-center justify-center text-center">
                <Droplets className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-3xl font-extrabold text-white tracking-tight">{selectedNodeReading.flow_rate.toFixed(1)}</p>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-1">Flow (L/min)</p>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex flex-col items-center justify-center text-center">
                <GaugeIcon className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-3xl font-extrabold text-white tracking-tight">{selectedNodeReading.pressure}</p>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-1">Pressure (kPa)</p>
              </div>
            </div>

            {/* Yield Correlation Module */}
            <div className="border-t border-neutral-800 pt-6">
              <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2 mb-4">
                <Scale className="w-5 h-5 text-emerald-400" /> {t.yieldTitle}
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Harvesting Log Form */}
                <div className="lg:col-span-1 p-5 rounded-2xl bg-neutral-950 border border-neutral-800/80">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-1">
                    <PlusCircle className="w-4 h-4 text-emerald-400" /> {t.addLog}
                  </h4>
                  <form onSubmit={handleAddHarvest} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">{t.cropType}</label>
                      <select 
                        value={cropType} 
                        onChange={(e) => setCropType(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white mt-1 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="tomato">{t.tomato}</option>
                        <option value="capsicum">{t.capsicum}</option>
                        <option value="cucumber">{t.cucumber}</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 uppercase">{t.yieldKg}</label>
                        <input 
                          type="number" 
                          placeholder="e.g. 250"
                          value={yieldAmount}
                          onChange={(e) => setYieldAmount(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white mt-1 focus:border-emerald-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 uppercase">Avg EC (mS/cm)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          placeholder="e.g. 1.5"
                          value={avgEc}
                          onChange={(e) => setAvgEc(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white mt-1 focus:border-emerald-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">{t.notes}</label>
                      <textarea 
                        rows={2} 
                        placeholder={t.notes}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white mt-1 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 rounded-xl bg-emerald-500 text-neutral-950 text-xs font-bold hover:bg-emerald-400 transition-colors"
                    >
                      {t.addLog}
                    </button>
                  </form>
                </div>

                {/* Harvesting Log Visualization Chart */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-950 border border-neutral-800/80">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">
                    {t.yieldChart}
                  </h4>
                  {chartData.length > 0 ? (
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                          <XAxis dataKey="date" stroke="#737373" fontSize={10} tickLine={false} />
                          <YAxis yAxisId="left" stroke="#10b981" fontSize={10} tickLine={false} label={{ value: 'Yield (kg)', angle: -90, position: 'insideLeft', fill: '#10b981', fontSize: 10 }} />
                          <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize={10} tickLine={false} label={{ value: 'EC (mS/cm)', angle: 90, position: 'insideRight', fill: '#06b6d4', fontSize: 10 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '12px' }} labelStyle={{ color: '#a3a3a3' }} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                          <Bar yAxisId="left" dataKey="yield" name="Yield (kg)" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.8} />
                          <Line yAxisId="right" type="monotone" dataKey="ec" name="Avg EC" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4' }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="w-full h-64 flex items-center justify-center text-neutral-500 text-xs">
                      No harvest logs recorded for this zone.
                    </div>
                  )}
                </div>

              </div>
            </div>

          </section>
        )}
      </div>
    </main>
  );
}
