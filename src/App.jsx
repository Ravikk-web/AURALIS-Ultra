import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import CanvasRenderer from './components/CanvasRenderer';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import visualizers from './visualizers/visualizers';
import { PALETTES } from './utils/palettes';
import { Mic, Maximize, Settings, X, Sliders, ChevronLeft, ChevronRight, Layers, Move, Volume2, Grid, Save, Trash2, Zap } from 'lucide-react';

const DEFAULT_SETTINGS = {
  sensitivity: 1.5,
  smoothing: 0.8,
  noiseThreshold: 10,
  density: 64,
  freqRange: 100,
  selectedPalette: 'neon_cyber',
  lineWidth: 3,
  glowIntensity: 20,
  padding: 2,
  barWidth: 0,
  speed: 1,
  gpuLayer: true
};

const App = () => {
  const { initAudio, isInitialized, analyser } = useAudioAnalyzer();
  const [activeVizId, setActiveVizId] = useState(1);
  const [showUI, setShowUI] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [profiles, setProfiles] = useState({});
  const [presets, setPresets] = useState([]);
  const [newPresetName, setNewPresetName] = useState('');

  const hideTimerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isNative = Capacitor.isNativePlatform();

  // Screen Wake Lock
  useEffect(() => {
    let wakeLock = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock acquired');
        }
      } catch (err) {
        console.warn('Screen Wake Lock failed:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLock) wakeLock.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    try {
      const savedProfiles = localStorage.getItem('auralis_profiles');
      if (savedProfiles) setProfiles(JSON.parse(savedProfiles));
      const savedPresets = localStorage.getItem('auralis_presets');
      if (savedPresets) setPresets(JSON.parse(savedPresets));
    } catch (e) {
      console.error("Storage Error", e);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(profiles).length > 0) {
      localStorage.setItem('auralis_profiles', JSON.stringify(profiles));
    }
  }, [profiles]);

  const activeSettings = useMemo(() => {
    return { ...DEFAULT_SETTINGS, ...(profiles[activeVizId] || {}) };
  }, [profiles, activeVizId]);

  const updateSetting = (key, value) => {
    setProfiles(prev => ({
      ...prev,
      [activeVizId]: {
        ...(prev[activeVizId] || DEFAULT_SETTINGS),
        [key]: value
      }
    }));
  };

  useEffect(() => {
    if (analyser) {
      analyser.smoothingTimeConstant = activeSettings.smoothing;
    }
  }, [analyser, activeSettings.smoothing]);

  const savePreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset = {
      id: Date.now().toString(),
      name: newPresetName,
      settings: activeSettings
    };
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('auralis_presets', JSON.stringify(updatedPresets));
    setNewPresetName('');
    alert(`Preset "${newPresetName}" saved!`);
  };

  const loadPreset = (preset) => {
    setProfiles(prev => ({
      ...prev,
      [activeVizId]: { ...preset.settings }
    }));
  };

  const deletePreset = (id, e) => {
    e.stopPropagation();
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem('auralis_presets', JSON.stringify(updated));
  };

  const toggleSettings = (e) => {
    e.stopPropagation();
    setShowSettings(!showSettings);
  };

  useEffect(() => {
    const handleActivity = () => {
      if (!showSettings) {
        setShowUI(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setShowUI(false), 3000);
      } else {
        setShowUI(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      }
    };
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    handleActivity();
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [showSettings]);

  const handleFullscreen = async () => {
    try {
      if (isNative) {
        const info = await StatusBar.getInfo();
        if (info.visible) {
          await StatusBar.hide();
        } else {
          await StatusBar.show();
        }
      } else {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(e => console.log(e));
        } else {
          document.exitFullscreen().catch(e => console.log(e));
        }
      }
    } catch (e) {
      console.error("Fullscreen toggle failed", e);
    }
  };

  const scrollVisuals = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const activeVisualizer = visualizers.find(v => v.id === activeVizId) || visualizers[0];

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white font-sans overflow-hidden select-none">

      {/* Canvas Layer */}
      <div className={`absolute inset-0 ${activeSettings.gpuLayer ? 'gpu-accelerated' : ''}`}>
        <CanvasRenderer
          visualizer={activeVisualizer.run}
          analyser={analyser}
          settings={{
            palette: activeSettings.selectedPalette,
            glow: activeSettings.glowIntensity,
            ...activeSettings
          }}
        />
      </div>

      {/* Start Overlay */}
      {!isInitialized && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="text-center p-6 md:p-8 w-full max-w-lg border border-white/10 rounded-2xl bg-zinc-900/50 shadow-2xl">
            <div className="mb-6 flex justify-center">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 animate-pulse" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-white mb-2">Auralis Ultra</h1>
            <p className="text-zinc-400 mb-8 text-sm md:text-lg">High-Performance Spatial Audio Visualization</p>

            <div className="flex justify-center">
              <button
                onClick={() => initAudio('mic')}
                className="group relative px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all overflow-hidden w-full md:w-auto"
              >
                <span className="flex items-center justify-center gap-2 font-medium">
                  <Mic size={18} className="text-purple-400" /> Start (Microphone)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      <div className={`transition-opacity duration-500 ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pointer-events-auto">
          <div className="bg-black/40 backdrop-blur-md p-3 md:p-4 rounded-xl border border-white/5 shadow-xl w-full md:w-auto md:min-w-[300px]">
            <h2 className="text-lg md:text-2xl font-bold tracking-tight text-white/90">{activeVisualizer.name}</h2>
            <p className="text-xs md:text-sm text-purple-200/70">{activeVisualizer.description}</p>
          </div>

          <div className="flex gap-2 self-end md:self-auto">
            <button onClick={handleFullscreen} className="p-2 md:p-3 bg-black/40 border border-white/5 rounded-full hover:bg-white/10 transition-colors backdrop-blur-md" title="Fullscreen">
              <Maximize size={18} className="md:w-5 md:h-5" />
            </button>
            <button onClick={toggleSettings} className={`p-2 md:p-3 border border-white/5 rounded-full transition-all backdrop-blur-md ${showSettings ? 'bg-purple-600/50 text-white' : 'bg-black/40 hover:bg-white/10'}`} title="Settings">
              <Settings size={18} className="md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-20 md:top-24 right-2 md:right-6 w-[95vw] md:w-96 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6 shadow-2xl pointer-events-auto z-40 max-h-[75vh] md:max-h-[80vh] overflow-y-auto hide-scrollbar animate-fade-in-down">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Sliders size={18} /> Configuration</h3>
              <button onClick={() => setShowSettings(false)} className="hover:text-red-400 transition-colors"><X size={20} /></button>
            </div>

            <div className="space-y-6 md:space-y-8">
              {/* Presets Management */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-2"><Save size={12} /> Presets</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Preset Name..."
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50 min-w-0"
                  />
                  <button onClick={savePreset} disabled={!newPresetName.trim()} className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white rounded-lg px-3 py-2 shrink-0">
                    <Save size={16} />
                  </button>
                </div>
                {presets.length > 0 && (
                  <div className="space-y-2 mt-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                    {presets.map(preset => (
                      <div key={preset.id} onClick={() => loadPreset(preset)} className="group flex items-center justify-between p-2 rounded-lg bg-black/20 hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-white/5">
                        <span className="text-sm text-zinc-200 truncate">{preset.name}</span>
                        <button onClick={(e) => deletePreset(preset.id, e)} className="opacity-100 md:opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audio Calibration & Performance */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2"><Volume2 size={12} /> Calibration & Perf</h4>
                <div>
                  <div className="flex justify-between text-xs mb-2 text-zinc-400 font-medium">
                    <span>Noise Gate Level</span>
                    <span className="text-white">{activeSettings.noiseThreshold}</span>
                  </div>
                  <input type="range" min="0" max="50" step="1" value={activeSettings.noiseThreshold} onChange={(e) => updateSetting('noiseThreshold', parseInt(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-orange-400" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className={activeSettings.gpuLayer ? 'text-yellow-400' : 'text-zinc-600'} />
                    <div className="text-xs font-medium text-zinc-300">GPU Acceleration Hint</div>
                  </div>
                  <button onClick={() => updateSetting('gpuLayer', !activeSettings.gpuLayer)} className={`w-10 h-5 rounded-full relative transition-colors ${activeSettings.gpuLayer ? 'bg-yellow-600' : 'bg-zinc-700'}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${activeSettings.gpuLayer ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2 text-zinc-400 font-medium">
                    <span>Smoothing (Flow)</span>
                    <span className="text-white">{activeSettings.smoothing.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0.1" max="0.99" step="0.01" value={activeSettings.smoothing} onChange={(e) => updateSetting('smoothing', parseFloat(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-orange-400" />
                </div>
              </div>

              {/* Structure & Frequency Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2"><Grid size={12} /> Structure & Frequency</h4>
                <div>
                  <div className="flex justify-between text-xs mb-2 text-zinc-400 font-medium">
                    <span>Density (Nodes Amount)</span>
                    <span className="text-white">{activeSettings.density}</span>
                  </div>
                  <input type="range" min="16" max="256" step="16" value={activeSettings.density} onChange={(e) => updateSetting('density', parseInt(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2 text-zinc-400 font-medium">
                    <span>Frequency Range</span>
                    <span className="text-white">{activeSettings.freqRange}%</span>
                  </div>
                  <input type="range" min="20" max="100" step="10" value={activeSettings.freqRange} onChange={(e) => updateSetting('freqRange', parseInt(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full" />
                </div>
              </div>

              {/* Visual Style Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2"><Layers size={12} /> Style</h4>
                <div>
                  <div className="flex justify-between text-xs mb-2 text-zinc-400 font-medium">
                    <span>Color Palette</span>
                    <span className="text-white capitalize">{PALETTES.find(p => p.id === activeSettings.selectedPalette)?.name}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {PALETTES.map(p => (
                      <button
                        key={p.id}
                        onClick={() => updateSetting('selectedPalette', p.id)}
                        className={`w-full aspect-square rounded-md border transition-all ${activeSettings.selectedPalette === p.id ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-white/50'}`}
                        style={{ background: p.id === 'rainbow_flow' ? 'linear-gradient(45deg, red, orange, yellow, green, blue, purple)' : `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1] || p.colors[0]})` }}
                        title={p.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Size & Layout */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-2"><Move size={12} /> Size & Layout</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-2 text-zinc-400 font-medium">
                      <span>Bar Width</span>
                      <span className="text-white">{activeSettings.barWidth === 0 ? 'Auto' : activeSettings.barWidth + 'px'}</span>
                    </div>
                    <input type="range" min="0" max="50" step="1" value={activeSettings.barWidth} onChange={(e) => updateSetting('barWidth', parseInt(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-2 text-zinc-400 font-medium">
                      <span>Spacing</span>
                      <span className="text-white">{activeSettings.padding}px</span>
                    </div>
                    <input type="range" min="0" max="20" step="1" value={activeSettings.padding} onChange={(e) => updateSetting('padding', parseInt(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2 text-zinc-400 font-medium">
                    <span>Sensitivity</span>
                    <span className="text-white">{activeSettings.sensitivity.toFixed(1)}x</span>
                  </div>
                  <input type="range" min="0.5" max="5.0" step="0.1" value={activeSettings.sensitivity} onChange={(e) => updateSetting('sensitivity', parseFloat(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Arrow Navigation */}
        <div className="absolute bottom-4 left-0 w-full px-4 md:bottom-6 md:px-6 pointer-events-auto flex items-center gap-2 md:gap-4">
          <button onClick={() => scrollVisuals('left')} className="p-2 md:p-3 rounded-full bg-black/40 border border-white/5 hover:bg-white/10 backdrop-blur-md transition-colors z-20">
            <ChevronLeft size={20} className="md:w-6 md:h-6" />
          </button>
          <div ref={scrollContainerRef} className="flex-1 overflow-x-auto pb-4 pt-2 snap-x flex gap-3 hide-scrollbar mask-gradient-sides scroll-smooth">
            {visualizers.map((viz) => {
              const isActive = activeVizId === viz.id;
              return (
                <button
                  key={viz.id}
                  onClick={() => setActiveVizId(viz.id)}
                  className={`
                    relative flex-shrink-0 w-28 h-16 md:w-40 md:h-24 rounded-xl border transition-all duration-300 overflow-hidden group snap-center
                    ${isActive ? 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.4)] scale-105 z-10' : 'border-white/5 hover:border-white/20 hover:scale-100 grayscale hover:grayscale-0 opacity-70 hover:opacity-100'}
                  `}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${isActive ? 'from-purple-900/40 to-black' : 'from-zinc-800 to-black'}`} />
                  <div className="absolute inset-0 opacity-30">
                    <svg className="w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
                      <path d={`M0,30 Q25,${isActive ? 10 : 30} 50,30 T100,30`} fill="none" stroke="white" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 text-left">
                    <span className="block text-[8px] md:text-[10px] font-bold text-white/40 tracking-widest mb-0.5">0{viz.id}</span>
                    <span className="text-[10px] md:text-xs font-semibold text-white leading-tight block truncate w-24 md:w-auto">{viz.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
          <button onClick={() => scrollVisuals('right')} className="p-2 md:p-3 rounded-full bg-black/40 border border-white/5 hover:bg-white/10 backdrop-blur-md transition-colors z-20">
            <ChevronRight size={20} className="md:w-6 md:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
