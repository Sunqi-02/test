
import React, { useState, useEffect } from 'react';
import { Cpu, DollarSign, TrendingUp, AlertTriangle, RefreshCw, Monitor, Copy, CheckCircle2, ChevronDown, ExternalLink, Share2, Search, Beaker, Rocket, Settings2, Gauge, Wrench, Sparkles, Key } from 'lucide-react';
import { BuildAnalysis, BuildPreferences, PartType, PerformanceMetric } from './types';
import { generateBuild, updateBuild, analyzeCustomGamePerformance } from './services/geminiService';
import PartItem from './components/PartItem';
import PerformanceChart from './components/PerformanceChart';

// Safe environment check helper
const getSafeApiKey = () => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process && process.env && process.env.API_KEY) {
      // @ts-ignore
      return process.env.API_KEY;
    }
  } catch (e) {
    return null;
  }
  return null;
};

// Logarithmic slider helpers
const MIN_BUDGET = 100;
const MAX_BUDGET = 30000;

const toLog = (value: number) => {
  if (value <= MIN_BUDGET) return 0;
  if (value >= MAX_BUDGET) return 100;
  return (Math.log(value / MIN_BUDGET) / Math.log(MAX_BUDGET / MIN_BUDGET)) * 100;
};

const fromLog = (position: number) => {
  if (position <= 0) return MIN_BUDGET;
  if (position >= 100) return MAX_BUDGET;
  const val = MIN_BUDGET * Math.pow(MAX_BUDGET / MIN_BUDGET, position / 100);
  return Math.round(val / 50) * 50;
};

const App: React.FC = () => {
  const [preferences, setPreferences] = useState<BuildPreferences>({
    budget: 2000, 
    usage: 'Gaming',
    allowUsed: true,
  });
  
  const [sliderValue, setSliderValue] = useState(toLog(2000));
  const [buildData, setBuildData] = useState<BuildAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [apiKeyExists, setApiKeyExists] = useState(false);
  const [canSelectKey, setCanSelectKey] = useState(false);
  
  // Custom Game Analysis State
  const [customGameName, setCustomGameName] = useState('');
  const [analyzingGame, setAnalyzingGame] = useState(false);
  const [customGameResult, setCustomGameResult] = useState<PerformanceMetric | null>(null);

  useEffect(() => {
    const key = getSafeApiKey();
    if (key) {
        setApiKeyExists(true);
    }

    setSliderValue(toLog(preferences.budget));

    // Check if we are in an environment that supports dynamic key selection (e.g. IDX/AI Studio)
    // @ts-ignore
    if (typeof window !== 'undefined' && window.aistudio) {
        setCanSelectKey(true);
        // @ts-ignore
        window.aistudio.hasSelectedApiKey().then((hasKey: boolean) => {
            if (hasKey) setApiKeyExists(true);
        }).catch(() => {});
    }
  }, []); // Only run once on mount

  const handleConnectApi = async () => {
      try {
        // @ts-ignore
        if (window.aistudio && window.aistudio.openSelectKey) {
            // @ts-ignore
            await window.aistudio.openSelectKey();
            setApiKeyExists(true); // Assume success to mitigate race condition
            setError(null);
        }
      } catch (e) {
          console.error("Failed to select key", e);
          setError("连接 API 失败，请刷新重试");
      }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pos = Number(e.target.value);
    setSliderValue(pos);
    const newBudget = fromLog(pos);
    // Use functional update to avoid dependency cycle if we were observing budget
    setPreferences(prev => ({ ...prev, budget: newBudget }));
  };

  const handleGenerate = async () => {
    if (!apiKeyExists) {
        // If we can select a key, trigger that flow instead of showing error
        if (canSelectKey) {
            handleConnectApi();
            return;
        }
        setError("未检测到 API Key。请检查环境变量。");
        return;
    }

    setLoading(true);
    setError(null);
    setCustomGameResult(null);
    setLoadingMessage("AI 正在连接算力中心...");
    
    const msgs = [
        "正在扫描全网行情 (京东/淘宝/闲鱼)...",
        "正在评估 E5/矿卡 与新平台性价比...",
        "正在计算 DLSS 3.0 / FSR 开启后的帧数...",
        "正在优化整机功耗与散热方案...",
        "正在分析升级潜力与系统瓶颈..."
    ];
    let msgIdx = 0;
    const interval = setInterval(() => {
        setLoadingMessage(msgs[msgIdx]);
        msgIdx = (msgIdx + 1) % msgs.length;
    }, 1500);

    try {
      const result = await generateBuild(preferences);
      setBuildData(result);
    } catch (err: any) {
      setError(err.message || "服务器连接不稳定，请重试。");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handlePartSwap = async (partType: PartType, instructions: string) => {
    if (!buildData) return;
    setLoading(true);
    setLoadingMessage(`正在重新选品: ${instructions}...`);
    
    try {
      const request = `把 ${partType} 换掉。要求: ${instructions}`;
      const result = await updateBuild(buildData, request, preferences);
      setBuildData(result);
      setCustomGameResult(null); 
    } catch (err: any) {
      setError("调整失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGameAnalysis = async () => {
      if (!customGameName.trim() || !buildData) return;
      setAnalyzingGame(true);
      try {
          const result = await analyzeCustomGamePerformance(buildData.parts, customGameName);
          setCustomGameResult(result);
      } catch (err) {
          console.error(err);
      } finally {
          setAnalyzingGame(false);
      }
  };

  const getBuildText = () => {
     if (!buildData) return '';
     return `【SmartBuild AI 配置单】\n总预算: ¥${buildData.totalPrice}\n` +
            buildData.parts.map(p => `• ${p.name} ¥${p.price}`).join('\n') + 
            `\n------------------\n${buildData.summary}`;
  };

  const copyBuildToClipboard = () => {
      navigator.clipboard.writeText(getBuildText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const shareBuild = async () => {
      // @ts-ignore
      if (navigator.share) {
          try {
              // @ts-ignore
              await navigator.share({
                  title: '我的装机单',
                  text: getBuildText(),
              });
          } catch (e) { /* ignore */ }
      } else {
          copyBuildToClipboard();
      }
  };

  const totalCost = buildData ? buildData.parts.reduce((acc, p) => acc + p.price, 0) : 0;
  const isOverBudget = totalCost > preferences.budget * 1.15;

  return (
    <div className="min-h-screen bg-[#09090b] font-sans pb-12 text-gray-100 selection:bg-indigo-500/30 overflow-x-hidden flex flex-col">
      {/* Optimized Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/10 via-gray-900 to-black opacity-80"></div>
      
      {/* Header */}
      <header className="fixed w-full top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setBuildData(null)}>
            <div className="bg-blue-600 p-1.5 md:p-2 rounded-lg shadow-lg shadow-blue-900/20">
              <Cpu className="text-white" size={18} />
            </div>
            <h1 className="text-base md:text-lg font-bold text-white tracking-tight leading-none">
                SmartBuild <span className="text-blue-500">AI</span>
            </h1>
          </div>
          {buildData && (
             <button onClick={() => setBuildData(null)} className="text-xs font-medium text-gray-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">
                 新配置
             </button>
          )}
        </div>
      </header>

      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 pt-20 md:pt-24 flex-grow">
        
        {/* Intro Section - Only Show when no data and not loading */}
        {!buildData && !loading && (
          <div className="max-w-2xl mx-auto mt-4 md:mt-10 animate-in fade-in zoom-in duration-500">
            <div className="text-center mb-8 md:mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-6">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                    </span>
                    Real-time Market Data
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                  你的下一台<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">梦中情机</span>
                </h2>
                <p className="text-gray-400 text-sm md:text-base max-w-md mx-auto">
                  垃圾佬神器？发烧友参谋？AI 帮你捡漏、比价、算帧数，拒绝高价低配。
                </p>
            </div>

            <div className="bg-[#121217] backdrop-blur-md p-5 md:p-8 rounded-2xl md:rounded-3xl border border-white/5 shadow-2xl">
              <div className="space-y-6 md:space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-4">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <DollarSign size={16} className="text-blue-500"/> 预算范围 (CNY)
                    </label>
                    <span className="text-3xl md:text-4xl font-bold text-white tracking-tighter">
                        <span className="text-base md:text-lg text-gray-500 font-normal mr-1">¥</span>
                        {preferences.budget.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Logarithmic Slider */}
                  <div className="relative w-full h-8 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={sliderValue}
                        onChange={handleSliderChange}
                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all touch-none z-10"
                      />
                  </div>
                  
                  <div className="flex justify-between text-[10px] font-bold text-gray-600 mt-1 uppercase tracking-wider px-1">
                    <span>¥100</span>
                    <span className="hidden sm:inline">¥2000</span>
                    <span className="hidden sm:inline">¥8000</span>
                    <span>¥30000+</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">主要用途</label>
                    <div className="relative">
                        <select 
                        value={preferences.usage}
                        // @ts-ignore
                        onChange={(e) => setPreferences({...preferences, usage: e.target.value})}
                        className="w-full bg-gray-800/50 border border-white/5 text-white rounded-xl px-4 py-3.5 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all appearance-none cursor-pointer text-sm font-medium hover:bg-gray-800"
                        >
                        <option value="Gaming">🎮 游戏电竞</option>
                        <option value="Productivity">🎬 生产力工具</option>
                        <option value="General">📺 影音办公</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-4 text-gray-500 pointer-events-none" size={16} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">成色偏好</label>
                    <button
                      onClick={() => setPreferences({...preferences, allowUsed: !preferences.allowUsed})}
                      className={`w-full py-3.5 px-3 rounded-xl border font-medium text-sm flex items-center justify-center gap-2 transition-all ${preferences.allowUsed ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-green-500/5 border-green-500/20 text-green-400'}`}
                    >
                      {preferences.allowUsed ? '♻️ 接受二手 (高性价比)' : '✨ 全新正品 (省心)'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!apiKeyExists && !canSelectKey}
                  className={`w-full font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 ${
                      !apiKeyExists && !canSelectKey 
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                   <Cpu size={20} /> 一键生成配置
                </button>
              </div>
              
              {!apiKeyExists && (
                   <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col md:flex-row items-center gap-3 text-red-400 text-xs transition-all">
                        <div className="flex items-center gap-2">
                             <AlertTriangle size={14} className="shrink-0" />
                             <p>需要连接 Gemini API 才能生成配置。</p>
                        </div>
                        {canSelectKey ? (
                            <button 
                                onClick={handleConnectApi}
                                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-bold border border-red-500/30 transition-colors flex items-center gap-2"
                            >
                                <Key size={12} />
                                连接 / 选择 API Key
                            </button>
                        ) : (
                            <span className="opacity-70">请在代码环境变量中设置 API_KEY</span>
                        )}
                   </div>
              )}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-[50vh] animate-in fade-in duration-500">
            <div className="relative w-16 h-16 md:w-20 md:h-20 mb-8">
              <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-gray-200 animate-pulse text-center px-4">{loadingMessage}</h3>
          </div>
        )}

        {/* Error */}
        {error && (
            <div className="max-w-md mx-auto mt-20 p-6 bg-red-900/20 border border-red-500/30 rounded-2xl text-center animate-in fade-in">
                <AlertTriangle className="mx-auto text-red-500 mb-4" size={40} />
                <h3 className="text-lg font-bold text-white mb-2">出错了</h3>
                <p className="text-red-300 text-sm mb-4">{error}</p>
                <button 
                    onClick={() => setError(null)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    重试
                </button>
            </div>
        )}

        {/* Results */}
        {buildData && !loading && (
          <div className="animate-in slide-in-from-bottom-8 duration-700 pb-12">
            
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
               <div className={`p-4 md:p-5 rounded-2xl border ${isOverBudget ? 'bg-red-500/5 border-red-500/20' : 'bg-gray-800/40 border-white/5'} backdrop-blur-md`}>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">总价预估</p>
                  <span className={`text-xl md:text-3xl font-bold ${isOverBudget ? 'text-red-400' : 'text-white'}`}>
                      ¥{totalCost.toLocaleString()}
                  </span>
               </div>
               <div className="p-4 md:p-5 rounded-2xl bg-gray-800/40 border border-white/5 backdrop-blur-md">
                   <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">功耗预估</p>
                   <div className="flex items-baseline gap-1">
                     <span className="text-xl md:text-2xl font-bold text-white">{buildData.estimatedWattage || '---'}</span>
                     <span className="text-xs text-gray-500">W</span>
                   </div>
               </div>
               <div className="p-4 md:p-5 rounded-2xl bg-gray-800/40 border border-white/5 backdrop-blur-md">
                   <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">装机难度</p>
                   <div className="flex items-center gap-2">
                     <Wrench size={16} className="text-gray-400" />
                     <span className="text-sm md:text-base font-bold text-white">
                       {buildData.buildDifficulty || '中等'}
                     </span>
                   </div>
               </div>
               <div className="p-4 md:p-5 rounded-2xl bg-gray-800/40 border border-white/5 backdrop-blur-md">
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">整机画像</p>
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400" />
                    <span className="text-sm md:text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                        {buildData.buildVibe || '实用主义'}
                    </span>
                  </div>
               </div>
            </div>

             {/* AI Summary */}
             <div className="mb-6 p-5 md:p-6 rounded-2xl bg-gradient-to-br from-indigo-900/10 to-blue-900/10 border border-indigo-500/10 backdrop-blur-md shadow-lg">
                  <div className="flex gap-3">
                      <div className="mt-1"><TrendingUp size={18} className="text-indigo-400"/></div>
                      <div>
                        <h4 className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">专家点评</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">{buildData.summary}</p>
                      </div>
                  </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
              
              {/* Parts List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between sticky top-[56px] md:top-[64px] z-30 bg-[#09090b]/95 py-3 backdrop-blur-lg border-b border-white/5 mb-2 transition-all">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">配置清单</h3>
                    <button 
                        onClick={
                            // @ts-ignore
                            navigator.share ? shareBuild : copyBuildToClipboard
                        }
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
                            copied 
                            ? 'bg-green-500 text-white' 
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                    >
                        {copied ? <CheckCircle2 size={14}/> : (
                            // @ts-ignore
                            navigator.share ? <Share2 size={14}/> : <Copy size={14}/>
                        )}
                        {copied ? '已复制' : (
                            // @ts-ignore
                            navigator.share ? '分享' : '复制清单'
                        )}
                    </button>
                </div>
                
                <div className="space-y-3 pb-8">
                  {buildData.parts.map((part, index) => (
                    <div className="animate-in fade-in slide-in-from-bottom-2" style={{animationDelay: `${index * 50}ms`}} key={part.id}>
                        <PartItem 
                        part={part} 
                        onSwapRequest={handlePartSwap}
                        isUpdating={loading}
                        />
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar - Sticky for better visual filling */}
              <div className="lg:col-span-1">
                 <div className="space-y-6 lg:sticky lg:top-[80px]">
                     
                     {/* Performance Chart */}
                     <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">性能表现</h3>
                        <div className="h-auto min-h-[350px] max-h-[500px]">
                            <PerformanceChart data={buildData.performance} />
                        </div>
                     </div>

                     {/* Custom Game Lab */}
                     <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/10 to-pink-900/10 border border-purple-500/10 backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-3">
                            <Beaker className="text-purple-400" size={18} />
                            <h4 className="font-bold text-purple-100 text-sm">游戏实验室</h4>
                        </div>
                        <p className="text-xs text-purple-300/70 mb-4">
                            输入你想玩的游戏，AI 实时预测帧数。
                        </p>
                        
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text"
                                value={customGameName}
                                onChange={(e) => setCustomGameName(e.target.value)}
                                placeholder="如: 剪映, CS2..."
                                className="flex-1 bg-black/20 border border-purple-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                            />
                            <button 
                                onClick={handleCustomGameAnalysis}
                                disabled={!customGameName.trim() || analyzingGame}
                                className="bg-purple-600 hover:bg-purple-500 text-white px-3 rounded-lg disabled:opacity-50 transition-colors"
                            >
                                {analyzingGame ? <RefreshCw size={14} className="animate-spin"/> : <Search size={14} />}
                            </button>
                        </div>

                        {customGameResult && (
                             <div className="animate-in fade-in slide-in-from-top-2 p-3 bg-black/20 rounded-lg border border-purple-500/20 flex justify-between items-center">
                                 <span className="text-sm font-bold text-white">{customGameResult.name}</span>
                                 <div className="text-right">
                                     <span className="text-lg font-bold text-purple-300">{customGameResult.value}</span>
                                     <span className="text-xs text-gray-500 ml-1">{customGameResult.unit}</span>
                                 </div>
                             </div>
                        )}
                     </div>

                     {/* Future Upgrades */}
                     {buildData.futureUpgrades && (
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900/10 to-teal-900/10 border border-emerald-500/10 backdrop-blur-md">
                             <div className="flex items-center gap-2 mb-3">
                                <Rocket className="text-emerald-400" size={18} />
                                <h4 className="font-bold text-emerald-100 text-sm">未来升级路线</h4>
                             </div>
                             <ul className="space-y-2">
                                {buildData.futureUpgrades.length > 0 ? buildData.futureUpgrades.map((upgrade, idx) => (
                                    <li key={idx} className="flex gap-2 text-xs text-gray-300 leading-relaxed">
                                        <span className="text-emerald-500 mt-0.5">➢</span>
                                        {upgrade}
                                    </li>
                                )) : <li className="text-xs text-gray-500">配置均衡，暂无急需升级建议</li>}
                             </ul>
                        </div>
                     )}
                     
                     {/* Bottleneck Analysis */}
                     {buildData.bottleneckScore !== undefined && (
                        <div className="p-5 rounded-2xl bg-gray-800/40 border border-white/5 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Gauge className="text-gray-400" size={18} />
                                    <h4 className="font-bold text-gray-200 text-sm">瓶颈分析</h4>
                                </div>
                                <span className="text-xs font-mono text-gray-400">{buildData.bottleneckScore}/100</span>
                            </div>
                            
                            <div className="relative h-2.5 bg-gray-700 rounded-full overflow-hidden mb-2">
                                <div 
                                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] z-10 transition-all duration-1000"
                                    style={{left: `${buildData.bottleneckScore}%`}}
                                ></div>
                                <div className="absolute inset-0 flex">
                                    <div className="flex-1 bg-gradient-to-r from-orange-500/50 to-blue-500/50"></div>
                                </div>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                                <span>显卡瓶颈 (4K)</span>
                                <span>均衡</span>
                                <span>CPU瓶颈 (网游)</span>
                            </div>
                             {buildData.bottleneckWarning && (
                                 <p className="mt-2 text-[10px] text-gray-400 border-t border-white/5 pt-2">
                                     {buildData.bottleneckWarning}
                                 </p>
                             )}
                        </div>
                     )}

                     {/* Gaming Tips */}
                     {buildData.gamingTips && (
                        <div className="p-5 rounded-2xl bg-gray-800/40 border border-white/5 backdrop-blur-md">
                             <div className="flex items-center gap-2 mb-3">
                                <Settings2 className="text-blue-400" size={18} />
                                <h4 className="font-bold text-gray-200 text-sm">电竞优化建议</h4>
                             </div>
                             <ul className="space-y-2">
                                {buildData.gamingTips.length > 0 ? buildData.gamingTips.map((tip, idx) => (
                                    <li key={idx} className="flex gap-2 text-xs text-gray-400">
                                        <span className="text-blue-500/50">•</span>
                                        {tip}
                                    </li>
                                )) : <li className="text-xs text-gray-500">保持驱动更新即可</li>}
                             </ul>
                        </div>
                     )}
                     
                     {/* Monitor Recommendation */}
                     <div className="p-5 rounded-2xl bg-gray-800/40 border border-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-1">
                            <Monitor className="text-gray-400" size={18} />
                            <h4 className="font-bold text-gray-200 text-sm">推荐显示器</h4>
                        </div>
                        <p className="text-sm font-bold text-white mt-1">
                            {buildData.monitorRecommendation || '1080P 144Hz IPS'}
                        </p>
                     </div>
                 </div>
              </div>

            </div>

            {/* Grounding & Footer */}
            <div className="mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {buildData.groundingSources && buildData.groundingSources.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">信息来源</h4>
                        <div className="flex flex-wrap gap-2">
                            {buildData.groundingSources.map((source, idx) => (
                                <a 
                                    key={idx} 
                                    href={source.uri} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-400 hover:text-white transition-colors border border-white/5"
                                >
                                    <ExternalLink size={10} />
                                    <span className="truncate max-w-[150px]">{source.title}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                <div className="text-[10px] text-gray-600">
                     Generated by Gemini 2.5 Flash • SmartBuild AI
                </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;
