
import React, { useState, useEffect } from 'react';
import { BuildPerformance, PerformanceMetric } from '../types';
import { BarChart3, Trophy, Mountain, Crosshair } from 'lucide-react';

interface Props {
  data: BuildPerformance;
}

type CategoryKey = keyof BuildPerformance;

const PerformanceChart: React.FC<Props> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<CategoryKey>('esports');
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(false);
    // Slight delay to trigger CSS transition
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, [activeTab, data]);

  if (!data) return null;

  const categories: { key: CategoryKey; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'esports', label: '电竞竞技', icon: <Crosshair size={14} />, color: 'bg-cyan-500' },
    { key: 'open_world', label: '开放世界', icon: <Mountain size={14} />, color: 'bg-emerald-500' },
    { key: 'aaa', label: '硬核 3A', icon: <Trophy size={14} />, color: 'bg-orange-500' },
    { key: 'benchmark', label: '极限跑分', icon: <BarChart3 size={14} />, color: 'bg-purple-500' },
  ];

  const currentCategory = categories.find(c => c.key === activeTab)!;
  const currentData = data[activeTab] || [];

  // Smart scaling logic
  const getProgressStats = (item: PerformanceMetric) => {
      let maxRef = 100;
      const val = item.value;
      const name = item.name.toLowerCase();

      if (activeTab === 'benchmark' || item.unit === '分') {
          if (name.includes('鲁大师')) maxRef = 1500000; 
          else if (name.includes('timespy') || name.includes('3dmark')) maxRef = 20000; 
          else if (name.includes('cinebench') || name.includes('r23')) maxRef = 30000; 
          else maxRef = 50000;
      } else if (activeTab === 'esports') {
          // CS2 and Valorant can go very high, others like Apex/PUBG are lower
          if (name.includes('cs2') || name.includes('valorant') || name.includes('无畏契约')) maxRef = 400;
          else if (name.includes('lol') || name.includes('league')) maxRef = 300;
          else maxRef = 240; // Apex, Overwatch, PUBG
      } else if (activeTab === 'open_world') {
           // Genshin often capped at 60 (or unlocked mod), others vary
           maxRef = 144; 
      } else {
          // AAA Games
          maxRef = 120; // 120 is a good target for frame gen enabled AAA
      }

      // Calculate percentage but cap at 100% and keep min 5%
      const rawPercent = (val / maxRef) * 100;
      const width = Math.min(Math.max(rawPercent, 5), 100);
      
      // Determine color intensity based on performance
      let qualityColor = currentCategory.color;
      if (activeTab !== 'benchmark') {
          // Specific thresholds per category
          if (activeTab === 'esports') {
             if (val < 60) qualityColor = 'bg-red-500';
             else if (val < 144) qualityColor = 'bg-yellow-500';
             else qualityColor = 'bg-green-500';
          } else if (activeTab === 'aaa') {
             if (val < 30) qualityColor = 'bg-red-500';
             else if (val < 60) qualityColor = 'bg-yellow-500';
             else qualityColor = 'bg-green-500'; // 60+ is green for AAA
          } else {
             if (val < 45) qualityColor = 'bg-red-500';
             else if (val < 75) qualityColor = 'bg-yellow-500';
             else qualityColor = 'bg-green-500';
          }
      }

      return { width, maxRef, qualityColor };
  };

  return (
    <div className="w-full bg-gray-800/40 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-md flex flex-col h-full shadow-xl">
      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-black/20 shrink-0">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={`flex-1 py-3 text-xs font-medium transition-all duration-300 relative group ${
              activeTab === cat.key
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <div className="flex flex-col items-center gap-1.5 z-10 relative">
                <span className={`transition-transform duration-300 ${activeTab === cat.key ? 'scale-110' : 'scale-100 opacity-70'}`}>
                    {cat.icon}
                </span>
                <span className="scale-90 sm:scale-100">{cat.label}</span>
            </div>
            {activeTab === cat.key && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${cat.color} shadow-[0_0_15px_currentColor]`} />
            )}
          </button>
        ))}
      </div>

      {/* Chart Area - Scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative min-h-[300px]">
        <div className="p-5 space-y-6">
            {currentData.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                    暂无数据
                </div>
            )}
            {currentData.map((item, index) => {
                const { width, qualityColor } = getProgressStats(item);
                
                return (
                <div key={index} className="relative group">
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">
                                {item.name}
                            </span>
                            {item.detail && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-gray-400 bg-white/5 whitespace-nowrap">
                                    {item.detail}
                                </span>
                            )}
                        </div>
                        <div className="text-right flex items-baseline gap-1">
                             <span className={`text-xl font-bold font-mono tracking-tight ${activeTab === currentCategory.key ? 'text-white' : ''}`}>
                                 {item.value.toLocaleString()}
                             </span>
                             <span className="text-xs text-gray-500 font-medium">{item.unit}</span>
                        </div>
                    </div>
                    
                    {/* Track */}
                    <div className="h-2 w-full bg-gray-900/50 rounded-full overflow-hidden relative border border-white/5">
                        {/* Bar */}
                        <div 
                            className={`h-full rounded-full ${activeTab === 'benchmark' ? currentCategory.color : qualityColor} shadow-[0_0_10px_rgba(0,0,0,0.5)] relative overflow-hidden`}
                            style={{ 
                                width: animate ? `${width}%` : '0%',
                                transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
                                transitionDelay: `${index * 50}ms`
                            }}
                        >
                            {/* Shimmer Effect */}
                            <div className="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                        </div>
                    </div>
                </div>
            )})}
            
            {/* Footer info in scroll view */}
            <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-500">
                 <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse"></div>
                     <span>AI 实时预测帧数</span>
                 </div>
                 <span>SmartBenchmark™</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;
