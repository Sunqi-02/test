
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { BuildAnalysis, BuildPreferences, PerformanceMetric, Part } from "../types";

// Robust environment check that won't crash browsers
const getApiKey = () => {
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process && process.env && process.env.API_KEY) {
            // @ts-ignore
            return process.env.API_KEY;
        }
    } catch (e) {
        console.warn("Environment access failed", e);
        return '';
    }
    return '';
};

let aiClient: GoogleGenAI | null = null;
const getAiClient = () => {
    if (!aiClient) {
        const key = getApiKey();
        if (key) {
            aiClient = new GoogleGenAI({ apiKey: key });
        }
    }
    return aiClient;
};

const JSON_CLEANER_REGEX = /```json\s*([\s\S]*?)\s*```/;

const parseResponse = (text: string) => {
    try {
        const match = text.match(JSON_CLEANER_REGEX);
        let jsonStr = match ? match[1] : text;
        if (!match) {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                jsonStr = text.substring(start, end + 1);
            }
        }
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("JSON Parse Error", e);
        throw new Error("AI 返回数据格式异常，正在重试...");
    }
};

// Retry helper for API calls with exponential backoff
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        if (retries > 0) {
            console.warn(`API call failed, retrying... (${retries} attempts left). Error: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};

export const generateBuild = async (prefs: BuildPreferences): Promise<BuildAnalysis> => {
  const apiKey = getApiKey();
  if (!apiKey) {
      throw new Error("API Key 未配置。请在代码环境中设置 API_KEY。");
  }

  const ai = getAiClient();
  if (!ai) throw new Error("AI 客户端初始化失败");
  
  const prompt = `
    角色：精通中国电脑配件市场的硬件专家。
    任务：为用户配置一台电脑。
    
    【需求】
    预算: ${prefs.budget} CNY (人民币)
    用途: ${prefs.usage}
    二手偏好: ${prefs.allowUsed ? "优先考虑高性价比二手/闲鱼/洋垃圾/矿卡 (如 RX580, E5, 3060m)" : "仅限全新，京东/天猫价格"}
    
    【核心指令】
    1. **价格准确性**：严格基于2024-2025年中国市场行情。
       - 1000元以下：E5洋垃圾、核显、老旧办公机。
       - 3000-4500元：12400F/5600 + 4060/6750GRE/4060Ti/3070(二手)。
       - 4500元以上：7500F/13600K + 4070/7800XT 等。
    2. **性能预测规则 (重要)**：
       - **3A大作 (如黑神话)**：必须假设开启 **DLSS/FSR + 帧生成**。不要给出保守的原生帧数。
       - **网游**：CS2/Valorant 应该很高。
    3. **创新功能**：
       - **装机难度**：评价这套配置对新手的友好度（ITX/水冷难，大机箱/风冷易）。
       - **整机画像**：用4个字形容这台电脑的气质（如：西装暴徒、光污染战士、极致实用）。
    
    【JSON结构】
    {
      "parts": [
        { "type": "CPU"|"GPU"|"Motherboard"|"RAM"|"Storage"|"Power Supply"|"Case"|"Cooler", "name": "具体型号", "price": int, "isUsed": bool, "reason": "中文短评" }
      ],
      "totalPrice": int,
      "estimatedWattage": int,
      "monitorRecommendation": "string (e.g. 2K 144Hz)",
      "summary": "中文点评，指出瓶颈或亮点",
      "buildDifficulty": "简单/中等/困难",
      "buildVibe": "string (4字成语或短语)",
      "performance": {
        "esports": [ 
             { "name": "无畏契约", "value": int, "unit": "FPS", "detail": "1080P 低" },
             { "name": "CS2", "value": int, "unit": "FPS", "detail": "1080P 低" },
             { "name": "LOL", "value": int, "unit": "FPS", "detail": "1080P 高" },
             { "name": "绝地求生", "value": int, "unit": "FPS", "detail": "三极致" },
             { "name": "Apex英雄", "value": int, "unit": "FPS", "detail": "低画质" },
             { "name": "永劫无间", "value": int, "unit": "FPS", "detail": "DLSS 性能" }
        ],
        "open_world": [ 
             { "name": "原神", "value": int, "unit": "FPS", "detail": "1080P/2K 高" },
             { "name": "绝区零", "value": int, "unit": "FPS", "detail": "高画质" },
             { "name": "崩坏：星穹铁道", "value": int, "unit": "FPS", "detail": "高画质" },
             { "name": "幻兽帕鲁", "value": int, "unit": "FPS", "detail": "中/高" }
        ],
        "aaa": [ 
             { "name": "黑神话：悟空", "value": int, "unit": "FPS", "detail": "高+DLSS/FG" },
             { "name": "赛博朋克2077", "value": int, "unit": "FPS", "detail": "中/高+DLSS" },
             { "name": "荒野大镖客2", "value": int, "unit": "FPS", "detail": "优化设置" },
             { "name": "地平线5", "value": int, "unit": "FPS", "detail": "极端画质" },
             { "name": "使命召唤20", "value": int, "unit": "FPS", "detail": "推荐配置" }
        ],
        "benchmark": [ 
          { "name": "鲁大师", "value": int, "unit": "分", "detail": "整机" },
          { "name": "3DMark TimeSpy", "value": int, "unit": "分", "detail": "显卡分" }
        ]
      },
      "bottleneckWarning": "string",
      "bottleneckScore": int (0-100),
      "valueScore": int (0-100),
      "futureUpgrades": ["string", "string"],
      "gamingTips": ["string", "string"]
    }
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "你是一个专业的装机佬，数据要真实，性能预测要包含DLSS/FSR加成，不要太保守。",
      },
    }));

    const text = response.text || "";
    const data = parseResponse(text);

    const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web)
      .filter((web: any) => web && web.uri)
      .map((web: any) => ({ title: web.title || '引用来源', uri: web.uri })) || [];
    
    return {
      ...data,
      performance: data.performance || { esports: [], open_world: [], aaa: [], benchmark: [] }, // Safety fallback
      futureUpgrades: data.futureUpgrades || [], // Safety fallback
      gamingTips: data.gamingTips || [], // Safety fallback
      groundingSources,
      parts: (data.parts || []).map((p: any, index: number) => ({...p, id: `part-${index}`}))
    };

  } catch (error: any) {
    console.error("Build Generation Error:", error);
    // User-friendly error mapping
    if (error.message.includes('API_KEY')) throw error;
    throw new Error("AI 思考超时，请检查网络或稍后重试。");
  }
};

export const updateBuild = async (
  currentBuild: BuildAnalysis, 
  userRequest: string,
  prefs: BuildPreferences
): Promise<BuildAnalysis> => {
    const ai = getAiClient();
    if (!ai) throw new Error("AI 客户端未初始化");
    
    const prompt = `
      Current JSON: ${JSON.stringify(currentBuild)}
      User Request: "${userRequest}"
      Update the JSON. Keep structure identical. 
      Ensure Price changes reflect the new part.
      Recalculate FPS/Scores based on the new part (Remember DLSS for AAA games).
      Re-evaluate bottleneckScore and futureUpgrades.
    `;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        }));
    
        const text = response.text || "";
        const data = parseResponse(text);

        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.map((chunk: any) => chunk.web)
          .filter((web: any) => web && web.uri)
          .map((web: any) => ({ title: web.title || 'Source', uri: web.uri })) || [];

        return {
            ...data,
            performance: data.performance || { esports: [], open_world: [], aaa: [], benchmark: [] },
            futureUpgrades: data.futureUpgrades || [],
            gamingTips: data.gamingTips || [],
            groundingSources,
            parts: (data.parts || []).map((p: any, index: number) => ({...p, id: `part-${index}`}))
        };
    } catch (error) {
        console.error("Update Error:", error);
        throw error;
    }
}

export const analyzeCustomGamePerformance = async (parts: Part[], gameName: string): Promise<PerformanceMetric> => {
    const ai = getAiClient();
    if (!ai) throw new Error("AI 客户端未初始化");

    const partsSummary = parts.map(p => `${p.type}: ${p.name}`).join(', ');

    const prompt = `
      PC Specs: ${partsSummary}
      Target App: "${gameName}"
      Task: Estimate performance.
      Rules:
      1. If AAA Game (Wukong, Cyberpunk), assume DLSS/FSR Balanced Mode is ON.
      2. If Competitive Game, assume Low/Competitive settings.
      Return JSON: { "name": "${gameName}", "value": number, "unit": "FPS/Score", "detail": "settings" }
    `;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        }));
        
        const text = response.text || "";
        return parseResponse(text);
    } catch (error) {
        console.error("Custom Analysis Error:", error);
        throw new Error("分析超时");
    }
};
