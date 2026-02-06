import { NextRequest } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'edge';

const apiKey = process.env.SILICON_CLOUD_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.siliconflow.cn/v1',
}) : null;

export async function POST(req: NextRequest) {
  if (!openai) {
    return new Response(JSON.stringify({ error: 'API_KEY_MISSING' }), { status: 401 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 批量翻译调高超时时间

  try {
    const { items, targetLang } = await req.json();

    if (!items || !Array.isArray(items) || !targetLang) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), { status: 400 });
    }

    const langNames: Record<string, string> = {
      zh: '中文 (Chinese)',
      en: '英文 (English)',
      jp: '日文 (Japanese)',
      kr: '韩文 (Korean)'
    };

    // 构造批量翻译的 Prompt
    const promptText = items.map((item, index) => `[${index}] ${item}`).join('\n');

    const response = await openai.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的多语言翻译助手。
你的任务是将一系列 GitHub 项目描述翻译成 ${langNames[targetLang] || targetLang}。
要求：
1. 必须严格按照输入格式返回，每一行必须以对应的 [index] 开头。
2. 即使原文很短或只有术语，也要返回对应的翻译行。
3. 保持语言简洁地道，保留技术术语。
4. 只返回翻译内容，禁止任何多余的解释、前言或总结。
示例输出格式：
[0] 这是一个 AI 项目
[1] 另一个工具库`
        },
        { role: 'user', content: promptText }
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const fullResult = response.choices[0]?.message?.content || '';
    
    // 解析结果
    const translatedMap: Record<number, string> = {};
    const lines = fullResult.split('\n');
    lines.forEach(line => {
      const match = line.match(/^\[(\d+)\]\s*(.*)/);
      if (match) {
        translatedMap[parseInt(match[1])] = match[2].trim();
      }
    });

    return new Response(JSON.stringify({ translatedMap }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'Request timeout' }), { status: 504 });
    }
    
    // 处理 429 Rate Limit
    if (error.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
    }

    console.error('Batch Translation API Error:', error);
    return new Response(JSON.stringify({ error: 'Translation failed' }), { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}
