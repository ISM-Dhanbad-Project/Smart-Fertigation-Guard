"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { MOCK_NODE_IDS } from '@/hooks/useMockDataGenerator';
import { predictNutrientAction, NutrientRecommendation } from '@/services/ai';
import { translations } from '@/services/translations';
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

  const t = translations[state.language || 'EN'];

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
    <main className="min-h-screen bg-base text-ink pb-24 font-body">
      {/* Top Header */}
      <div className="bg-ink text-base px-4 py-4 shadow-md flex justify-between items-center">
        <h1 className="font-display font-bold text-2xl uppercase tracking-widest flex items-center gap-3">
          <BrainCircuit className="w-8 h-8 text-base" />
          {t.aiAgronomist}
        </h1>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <header>
          <p className="text-ink/70 font-bold uppercase tracking-wider">{t.mlRecommendations}</p>
        </header>

        <section className="bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-6 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-widest text-ink/70">{t.selectZone}</label>
              <select 
                value={nodeId} onChange={e => setNodeId(e.target.value)}
                className="w-full bg-white border-2 border-ink text-ink font-bold rounded-none px-4 py-3 outline-none uppercase tracking-widest focus:bg-base"
              >
                {MOCK_NODE_IDS.map(id => <option key={id} value={id}>{id}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-widest text-ink/70">{t.cropType}</label>
              <select 
                value={crop} onChange={e => setCrop(e.target.value)}
                className="w-full bg-white border-2 border-ink text-ink font-bold rounded-none px-4 py-3 outline-none uppercase tracking-widest focus:bg-base"
              >
                {CROPS.map(c => <option key={c} value={c}>{t[c.toLowerCase() as keyof typeof t] || c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-widest text-ink/70">{t.growthStage}</label>
              <select 
                value={stage} onChange={e => setStage(e.target.value)}
                className="w-full bg-white border-2 border-ink text-ink font-bold rounded-none px-4 py-3 outline-none uppercase tracking-widest focus:bg-base"
              >
                {STAGES.map(s => <option key={s} value={s}>{t[s.toLowerCase() as keyof typeof t] || s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <div className="px-4 py-2 bg-base border-2 border-ink flex items-center gap-2">
              <span className="font-bold uppercase tracking-widest text-sm text-ink/70">pH:</span>
              <span className="font-display font-bold text-2xl">{nodeData?.ph?.toFixed(1) || '--'}</span>
            </div>
            <div className="px-4 py-2 bg-base border-2 border-ink flex items-center gap-2">
              <span className="font-bold uppercase tracking-widest text-sm text-ink/70">EC:</span>
              <span className="font-display font-bold text-2xl">{nodeData?.ec?.toFixed(2) || '--'}</span>
            </div>
          </div>

          {/* Instrument Readout for AI Recommendation */}
          <div className="relative overflow-hidden bg-base border-2 border-ink p-8">
            <h3 className="text-xl font-display font-bold uppercase tracking-widest flex items-center gap-2 mb-6 border-b-2 border-ink pb-2">
              <AlertCircle className="w-6 h-6 text-accent" /> {t.systemRecommendation}
            </h3>
            
            {isLoading ? (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-6 py-1">
                  <div className="h-6 bg-ink/20 w-3/4"></div>
                  <div className="h-6 bg-ink/20 w-5/6"></div>
                </div>
              </div>
            ) : insight ? (
              <div className="space-y-8">
                <p className="font-display text-4xl font-bold leading-tight uppercase text-ink">
                  {insight.action}
                </p>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-t-2 border-ink pt-6">
                  <div className="flex flex-col">
                     <span className="font-bold uppercase tracking-widest text-sm text-ink/70 mb-1">{t.confidence}</span>
                     <span className="font-display text-3xl font-bold text-[#15B79E]">
                        {Math.round(insight.confidence * 100)}%
                     </span>
                  </div>
                  
                  <button 
                    onClick={speakInsight}
                    className={cn(
                      "flex items-center gap-3 px-6 py-4 border-2 border-ink font-bold uppercase tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] active:translate-y-1 active:shadow-none",
                      isSpeaking 
                        ? "bg-accent text-white" 
                        : "bg-white hover:bg-base"
                    )}
                  >
                    <Volume2 className={cn("w-6 h-6", isSpeaking && "animate-pulse")} />
                    {isSpeaking ? t.speaking : t.readAloud}
                  </button>
                </div>
              </div>
            ) : (
              <p className="font-display font-bold text-2xl text-ink/50 uppercase">{t.waitingData}</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
