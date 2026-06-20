"use client";

import { useState, useEffect, useCallback } from 'react';
import { getRecentReadingsByNode } from '@/services/db';
import { MOCK_NODE_IDS } from '@/hooks/useMockDataGenerator';
import { SensorReading } from '@/types';
import { Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function HistoryPage() {
  const [nodeId, setNodeId] = useState(MOCK_NODE_IDS[0]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
    <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Logs</h1>
          <p className="text-neutral-400 text-sm mt-1">Historical sensor readings & exports</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={nodeId} 
            onChange={e => setNodeId(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-emerald-500"
          >
            {MOCK_NODE_IDS.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
          <button 
            onClick={fetchReadings}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-emerald-500' : 'text-neutral-300'}`} />
          </button>
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </header>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-400 uppercase bg-neutral-950/50">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">pH</th>
                <th className="px-6 py-4">EC</th>
                <th className="px-6 py-4">Flow (L/m)</th>
                <th className="px-6 py-4">Pressure</th>
                <th className="px-6 py-4">Turbidity</th>
              </tr>
            </thead>
            <tbody>
              {readings.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-500">No recent readings found for this node.</td></tr>
              ) : (
                readings.map((r, i) => (
                  <tr key={i} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                    <td className="px-6 py-3 font-medium whitespace-nowrap">{format(new Date(r.timestamp), 'HH:mm:ss')}</td>
                    <td className="px-6 py-3">{r.ph}</td>
                    <td className="px-6 py-3">{r.ec}</td>
                    <td className="px-6 py-3">{r.flow_rate}</td>
                    <td className="px-6 py-3">{r.pressure}</td>
                    <td className="px-6 py-3">{r.turbidity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
