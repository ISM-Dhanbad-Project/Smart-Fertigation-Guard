"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { MOCK_NODE_IDS } from '@/hooks/useMockDataGenerator';
import { predictNutrientAction, NutrientRecommendation } from '@/services/ai';
import { BrainCircuit, Sprout, AlertCircle, Volume2 } from 'lucide-react';

function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}

const CROPS = ['Tomato', 'Capsicum', 'Cucumber'];
const STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting'];

export default function InsightsPage() {
  const { state } = useAppContext();
  const [nodeId, setNodeId] = useState(MOCK_NODE_IDS[0]);
  const [crop, setCrop] = useState(CROPS[0]);
  const [stage, setStage] = useState(STAGES[1]);
  
  const [insight, setInsight] = useState<NutrientRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const nodeData = state.nodes[nodeId];

  useEffect(() => {
    if (!nodeData) return;
    setIsLoading(true);
    predictNutrientAction({
      currentPh: nodeData.ph,
      currentEc: nodeData.ec,
      cropType: crop,
      growthStage: stage
    }).then(res => {
      setInsight(res);
      setIsLoading(false);
    });
  }, [nodeData, crop, stage]);

  const speakInsight = () => {
    if (!insight || !('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = `AI Recommendation for ${crop} in ${stage} stage: ${insight.action}. Confidence level is ${Math.round(insight.confidence * 100)}%.`;
    utterance.rate = 0.9;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BrainCircuit className="w-8 h-8 text-indigo-400" />
          AI Agronomist
        </h1>
        <p className="text-neutral-400 text-sm mt-1">Machine Learning Nutrient Recommendations</p>
      </header>

      <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-neutral-400 font-medium">Select Zone</label>
            <select 
              value={nodeId} onChange={e => setNodeId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
            >
              {MOCK_NODE_IDS.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-neutral-400 font-medium">Crop Type</label>
            <select 
              value={crop} onChange={e => setCrop(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
            >
              {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-neutral-400 font-medium">Growth Stage</label>
            <select 
              value={stage} onChange={e => setStage(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
            >
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="px-4 py-2 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center gap-2">
            <span className="text-neutral-500 text-sm">Current pH:</span>
            <span className="font-semibold text-emerald-400">{nodeData?.ph || '--'}</span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center gap-2">
            <span className="text-neutral-500 text-sm">Current EC:</span>
            <span className="font-semibold text-cyan-400">{nodeData?.ec || '--'}</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/40 to-neutral-900 border border-indigo-500/20 p-8">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Sprout className="w-32 h-32" />
          </div>
          
          <h3 className="text-lg font-semibold text-indigo-300 flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5" /> Recommendation
          </h3>
          
          {isLoading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-indigo-500/20 rounded w-3/4"></div>
                <div className="h-4 bg-indigo-500/20 rounded w-5/6"></div>
              </div>
            </div>
          ) : insight ? (
            <div className="space-y-6">
              <p className="text-2xl leading-relaxed text-neutral-100 font-light relative z-10">
                &quot;{insight.action}&quot;
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Confidence: {Math.round(insight.confidence * 100)}%
                </span>
                
                <button 
                  onClick={speakInsight}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-all",
                    isSpeaking 
                      ? "bg-indigo-500 text-white animate-pulse" 
                      : "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                  )}
                >
                  <Volume2 className="w-4 h-4" />
                  {isSpeaking ? 'Speaking...' : 'Read Aloud'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-neutral-400">Waiting for sensor data...</p>
          )}
        </div>
      </section>
    </main>
  );
}
