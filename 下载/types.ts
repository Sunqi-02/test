
export enum PartType {
  CPU = 'CPU',
  GPU = 'GPU',
  Motherboard = 'Motherboard',
  RAM = 'RAM',
  Storage = 'Storage',
  PSU = 'Power Supply',
  Case = 'Case',
  Cooler = 'Cooler',
}

export interface Part {
  id: string;
  type: PartType;
  name: string;
  price: number;
  isUsed: boolean;
  reason: string;
  url?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number; // FPS or Score
  unit: string;  // 'FPS' or '分'
  detail?: string; // e.g. '1080P High'
}

export interface BuildPerformance {
  esports: PerformanceMetric[]; // Valorant, CS2, LOL, Naraka
  open_world: PerformanceMetric[]; // Genshin, Palworld, Wuthering Waves
  aaa: PerformanceMetric[];     // Wukong, CP2077, Elden Ring
  benchmark: PerformanceMetric[]; // 3DMark, Cinebench
}

export interface BuildAnalysis {
  totalPrice: number;
  parts: Part[];
  summary: string;
  performance: BuildPerformance;
  bottleneckWarning?: string; // Short text warning
  valueScore: number;
  estimatedWattage: number;
  monitorRecommendation: string;
  groundingSources?: { title: string; uri: string }[];
  
  // New Innovative Features
  futureUpgrades: string[]; // List of suggested future upgrades
  gamingTips: string[]; // BIOS settings, Windows optimizations
  bottleneckScore: number; // 0-100. <40 GPU bound, >60 CPU bound, 40-60 Balanced.
  
  // Visual & Practical extras
  buildDifficulty?: string; // Easy, Medium, Hard
  buildVibe?: string; // 4-char description of the aesthetic
}

export interface BuildPreferences {
  budget: number;
  usage: 'Gaming' | 'Productivity' | 'General';
  allowUsed: boolean;
}
