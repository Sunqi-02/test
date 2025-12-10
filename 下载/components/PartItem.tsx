
import React, { useState } from 'react';
import { Part, PartType } from '../types';
import { RefreshCw, Tag, ChevronDown, Check } from 'lucide-react';

interface Props {
  part: Part;
  onSwapRequest: (partType: PartType, instructions: string) => void;
  isUpdating: boolean;
}

const PartItem: React.FC<Props> = ({ part, onSwapRequest, isUpdating }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showSwapPanel, setShowSwapPanel] = useState(false);
  const [swapType, setSwapType] = useState('better');
  const [customReason, setCustomReason] = useState('');

  const swapOptions = [
    { value: 'better', label: '🔥 升级配置 (加钱)' },
    { value: 'cheaper', label: '💰 预算吃紧 (找便宜的)' },
    { value: 'brand', label: '🏷️ 换个品牌 (不喜欢这个)' },
    { value: 'new', label: '✨ 仅限全新 (不要二手)' },
    { value: 'used', label: '♻️ 二手也可 (追求性价比)' },
    { value: 'custom', label: '✏️ 自定义需求...' },
  ];

  const handleSwapSubmit = () => {
    let instructions = '';
    if (swapType === 'custom') {
        if (!customReason.trim()) return;
        instructions = customReason;
    } else {
        const option = swapOptions.find(o => o.value === swapType);
        instructions = option ? option.label : '换一个';
    }
    
    onSwapRequest(part.type, instructions);
    setShowSwapPanel(false);
    setCustomReason('');
  };

  const getIcon = (type: PartType) => {
    switch (type) {
        case PartType.CPU: return "🧠";
        case PartType.GPU: return "🎞️";
        case PartType.Motherboard: return "🔌";
        case PartType.RAM: return "💾";
        case PartType.Storage: return "💿";
        case PartType.PSU: return "⚡";
        case PartType.Case: return "📦";
        case PartType.Cooler: return "❄️";
        default: return "🔧";
    }
  };

  const getChineseType = (type: PartType) => {
      switch (type) {
        case PartType.CPU: return "处理器 CPU";
        case PartType.GPU: return "显卡 GPU";
        case PartType.Motherboard: return "主板";
        case PartType.RAM: return "内存";
        case PartType.Storage: return "硬盘";
        case PartType.PSU: return "电源";
        case PartType.Case: return "机箱";
        case PartType.Cooler: return "散热";
        default: return type;
      }
  };

  const getSearchLink = (platform: 'jd' | 'taobao' | 'xianyu') => {
      const keyword = encodeURIComponent(part.name);
      switch(platform) {
          case 'jd': return `https://search.jd.com/Search?keyword=${keyword}`;
          case 'taobao': return `https://s.taobao.com/search?q=${keyword}`;
          case 'xianyu': return `https://s.2.taobao.com/list/list.htm?q=${keyword}`;
          default: return '#';
      }
  };

  return (
    <div 
      className={`relative group bg-gray-800/40 hover:bg-gray-800 rounded-xl p-3 sm:p-4 border transition-all duration-300 ${isHovered ? 'border-accent-500 shadow-lg shadow-accent-500/5' : 'border-gray-700'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex justify-between items-start gap-3">
        {/* Icon & Details */}
        <div className="flex items-start gap-3 sm:gap-4 flex-1 overflow-hidden">
          <div className="text-xl sm:text-2xl bg-gray-700/50 p-2 sm:p-2.5 rounded-xl border border-gray-600/30 flex-shrink-0">
            {getIcon(part.type)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">{getChineseType(part.type)}</span>
                {part.isUsed ? (
                    <span className="flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">
                        <Tag size={10} /> 闲鱼/二手
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded border border-green-500/20 whitespace-nowrap">
                        <Check size={10} /> 全新
                    </span>
                )}
            </div>
            <h4 className="text-white font-bold text-sm sm:text-lg leading-tight truncate pr-2" title={part.name}>{part.name}</h4>
            <p className="text-gray-400 text-xs mt-1.5 leading-relaxed line-clamp-2">{part.reason}</p>
            
            {/* Shopping Links - Optimized for Mobile Touch */}
            <div className={`mt-3 flex items-center gap-2 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-100 sm:opacity-0'}`}>
                <span className="text-[10px] text-gray-500">找货:</span>
                <a href={getSearchLink('jd')} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-2.5 py-1 rounded border border-red-600/30 transition-colors">
                    JD 京东
                </a>
                <a href={getSearchLink('taobao')} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white px-2.5 py-1 rounded border border-orange-500/30 transition-colors">
                    TB 淘宝
                </a>
                 <a href={getSearchLink('xianyu')} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400 hover:text-black px-2.5 py-1 rounded border border-yellow-400/30 transition-colors">
                    🐠 闲鱼
                </a>
            </div>
          </div>
        </div>
        
        {/* Price & Action */}
        <div className="text-right flex flex-col items-end min-w-[80px] sm:min-w-[90px] pl-2">
          <span className="text-lg sm:text-xl font-bold text-accent-400 block tracking-tight font-mono">
             ¥{part.price.toLocaleString()}
          </span>
          
          <button 
            onClick={() => setShowSwapPanel(!showSwapPanel)}
            disabled={isUpdating}
            className={`mt-2 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors touch-manipulation ${
                showSwapPanel 
                ? 'bg-accent-600 text-white' 
                : 'bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-600'
            }`}
          >
            <RefreshCw size={12} className={isUpdating ? "animate-spin" : ""} />
            更换
            <ChevronDown size={12} className={`transition-transform ${showSwapPanel ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {showSwapPanel && (
        <div className="mt-4 bg-gray-900 p-4 rounded-xl border border-gray-700 animate-in slide-in-from-top-2 fade-in relative z-20">
          <div className="flex flex-col gap-3">
            <label className="text-xs text-gray-400 font-medium">请选择调整方向：</label>
            <div className="grid grid-cols-2 gap-2">
                {swapOptions.filter(o => o.value !== 'custom').map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setSwapType(opt.value)}
                        className={`text-xs text-left px-3 py-2.5 rounded-lg border transition-all ${
                            swapType === opt.value 
                            ? 'bg-accent-500/20 border-accent-500 text-accent-300' 
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <button
                 onClick={() => setSwapType('custom')}
                 className={`text-xs text-left px-3 py-2.5 rounded-lg border transition-all ${
                    swapType === 'custom'
                    ? 'bg-accent-500/20 border-accent-500 text-accent-300' 
                    : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                }`}
            >
                {swapOptions.find(o => o.value === 'custom')?.label}
            </button>

            {swapType === 'custom' && (
                <input 
                  type="text" 
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder='请输入具体要求（例如：我要华硕的主板）'
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-500 transition-colors"
                  autoFocus
                />
            )}

            <button 
              onClick={handleSwapSubmit}
              disabled={swapType === 'custom' && !customReason.trim()}
              className="w-full mt-1 bg-accent-600 hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 touch-manipulation"
            >
              <RefreshCw size={16} /> 确认调整
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartItem;
