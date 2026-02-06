import { NextRequest } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'edge';

// 初始化 OpenAI 客户端 (可配置为 DeepSeek 或其他兼容接口)
const apiKey = process.env.SILICON_CLOUD_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.siliconflow.cn/v1',
}) : null;

export async function POST(req: NextRequest) {
  if (!openai) {
    return new Response(JSON.stringify({ 
      error: 'API_KEY_MISSING',
      message: '未检测到 DEEPSEEK_API_KEY。请确保项目根目录的 .env 文件中有该配置，并重启开发服务器。' 
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: '消息列表不能为空' }), { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的 GitHub AI 插件管家。你必须精准判断用户的意图并采取行动。

### 意图识别规则（最高优先级）：

1. 寻找/推荐插件意图 (MUST CALL TOOL)：
   - 触发场景：用户提到想要某种功能、某种类型的插件、或者直接搜索。
   - 动作：立即调用 search_plugins 工具。
   - 参数：
     - category: 必须设为 "search"。
     - query: 关键点。必须从用户输入中提取最核心的功能关键词。
       - 核心技巧：提取 1-3 个核心功能英文词汇。GitHub 是英文社区，搜索 "translate" 比 "翻译" 结果多 100 倍。
       - 示例 1：用户说“有没有翻译网页的插件”，query 应设为 "translate web"。
       - 示例 2：用户说“查找可以翻译的插件”，query 应设为 "translate"。
       - 示例 3：用户说“我想画图”，query 应设为 "image generation" 或 "stable diffusion"。
     - 严禁：严禁直接在对话框中列出插件列表或只做口头回答。

2. 知识/咨询意图 (DIRECT ANSWER)：
   - 触发场景：问什么是 AI、解释代码逻辑、闲聊、询问网站如何使用、问你是谁。
   - 动作：直接输出文本，不要调用工具。

### 执行逻辑：
- 如果用户说“帮我找个翻译插件”，这是意图 1，必须调用工具。
- 如果用户说“翻译插件是什么？”，这是意图 2，直接解释。
- 混合意图：如果用户既问了问题又想找插件，优先调用工具进行页面跳转。

### 回复规范：
- 调用工具后，只需回复：“🔍 正在为您检索相关插件并跳转到‘我的搜索’板块...”
- 严禁在未跳转的情况下欺骗用户说“为您呈现如下结果”。`
        },
        ...messages
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'search_plugins',
            description: '在 GitHub 上搜索插件或切换分类。仅在用户明确要求寻找、推荐、展示插件或切换页面板块时使用。',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: '搜索关键词。'
                },
                category: {
                  type: 'string',
                  description: '分类：all (全部), functional (功能型), chat (对话类), model (大模型), image (图像类), entertainment (趣味类), search (我的搜索)。',
                  enum: ['all', 'functional', 'chat', 'model', 'image', 'entertainment', 'search']
                },
                sort: {
                  type: 'string',
                  description: '排序：best, stars, updated。',
                  enum: ['best', 'stars', 'updated']
                }
              }
            }
          }
        }
      ],
      stream: true,
      tool_choice: 'auto', 
    });

    // 将 OpenAI 的流转换为 Web 标准的 ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullToolCall: any = null;

        try {
          for await (const chunk of response) {
            const delta = chunk.choices[0]?.delta;
            const finishReason = chunk.choices[0]?.finish_reason;
            
            // 1. 累积工具调用数据
            if (delta?.tool_calls) {
              const toolCallDelta = delta.tool_calls[0];
              if (!fullToolCall) {
                fullToolCall = {
                  id: toolCallDelta.id,
                  type: 'function',
                  function: {
                    name: toolCallDelta.function?.name || '',
                    arguments: toolCallDelta.function?.arguments || ''
                  }
                };
              } else {
                if (toolCallDelta.function?.name) {
                  fullToolCall.function.name += toolCallDelta.function.name;
                }
                if (toolCallDelta.function?.arguments) {
                  fullToolCall.function.arguments += toolCallDelta.function.arguments;
                }
              }
            }

            // 2. 处理普通文本内容
            if (delta?.content) {
              controller.enqueue(encoder.encode(delta.content));
            }

            // 3. 当工具调用结束时（通过 finish_reason 或后续无 tool_calls 判定）
            if (fullToolCall && (finishReason === 'tool_calls' || finishReason === 'stop' || (!delta?.tool_calls && delta?.content))) {
              controller.enqueue(encoder.encode(`__TOOL_CALL__${JSON.stringify(fullToolCall)}@@END_TOOL_CALL@@`));
              fullToolCall = null; 
            }
          }

          // 4. 兜底：如果流结束了还有没发出的工具调用
          if (fullToolCall) {
            controller.enqueue(encoder.encode(`__TOOL_CALL__${JSON.stringify(fullToolCall)}@@END_TOOL_CALL@@`));
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('LLM API Error:', error);
    return new Response(JSON.stringify({ error: 'AI 助手暂时不可用，请检查 API 配置' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
