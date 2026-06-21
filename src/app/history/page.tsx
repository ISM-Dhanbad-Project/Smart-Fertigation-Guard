"use client";

import { useState, useEffect, useCallback } from 'react';
import { getRecentReadingsByNode } from '@/services/db';
import { MOCK_NODE_IDS } from '@/hooks/useMockDataGenerator';
import { SensorReading } from '@/types';
import { Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useAppContext } from '@/context/AppContext';
import { translations } from '@/services/translations';

function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function HistoryPage() {
  const { state } = useAppContext();
  const [nodeId, setNodeId] = useState(MOCK_NODE_IDS[0]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const t = translations[state.language || 'EN'];

  const fetchReadings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getRecentReadingsByNode(nodeId, 100);
      setReadings(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  const exportCSV = () => {
    if (readings.length === 0) return;
    const headers = ['timestamp', 'node_id', 'ph', 'ec', 'flow_rate', 'pressure', 'turbidity'];
    const rows = readings.map(r => [
      r.timestamp, r.node_id, r.ph, r.ec, r.flow_rate, r.pressure, r.turbidity
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `export_${nodeId}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-base text-ink pb-24 font-body">
      {/* Top Header */}
      <div className="bg-ink text-base px-4 py-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="font-display font-bold text-2xl uppercase tracking-widest">{t.logs}</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-ink/70 font-bold uppercase tracking-wider">{t.historicalReadings}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select 
              value={nodeId} 
              onChange={e => setNodeId(e.target.value)}
              className="bg-white border-2 border-ink text-ink font-bold text-sm px-4 py-2 outline-none uppercase tracking-widest"
            >
              {MOCK_NODE_IDS.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            <button 
              onClick={fetchReadings}
              className="p-2 border-2 border-ink bg-white hover:bg-base transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={cn("w-5 h-5", isLoading ? 'animate-spin text-accent' : 'text-ink')} />
            </button>
            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 border-2 border-ink bg-accent text-white font-bold uppercase tracking-wider hover:bg-accent/90 transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] active:translate-y-1 active:shadow-none"
            >
              <Download className="w-5 h-5" /> Export CSV
            </button>
          </div>
        </header>

        <div className="bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-ink text-base font-display font-bold uppercase tracking-widest text-sm">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">pH</th>
                  <th className="px-6 py-4">EC</th>
                  <th className="px-6 py-4">Flow (L/h)</th>
                  <th className="px-6 py-4">Pressure</th>
                  <th className="px-6 py-4">Turbidity</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink">
                {readings.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center font-bold uppercase tracking-widest">No recent readings found for this node.</td></tr>
                ) : (
                  readings.map((r, i) => (
                    <tr key={i} className={cn("hover:bg-[#EAE6E1] transition-colors", i % 2 === 0 ? "bg-white" : "bg-base")}>
                      <td className="px-6 py-4 font-bold whitespace-nowrap">{format(new Date(r.timestamp), 'HH:mm:ss')}</td>
                      <td className="px-6 py-4 font-display font-bold text-lg">{r.ph.toFixed(1)}</td>
                      <td className="px-6 py-4 font-display font-bold text-lg">{r.ec.toFixed(2)}</td>
                      <td className="px-6 py-4 font-display font-bold text-lg">{r.flow_rate.toFixed(1)}</td>
                      <td className="px-6 py-4 font-display font-bold text-lg">{r.pressure}</td>
                      <td className="px-6 py-4 font-display font-bold text-lg">{r.turbidity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
