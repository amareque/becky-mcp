import OpenAI from 'openai'

// Types for LLM integration
export interface Tool {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, any>
    required: string[]
  }
}

export interface ToolFunction {
  [key: string]: (params: any) => Promise<any>
}

export interface LLMRequest {
  systemPrompt: string
  userMessage: string
  context?: any
  tools?: Tool[]
  toolFunctions?: ToolFunction
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Run Becky LLM with basic functionality
 */
export async function runBeckyLLM(request: LLMRequest): Promise<string> {
  const { systemPrompt, userMessage, context } = request

  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('No LLM API key provided. Please set OPENAI_API_KEY')
  }

  return await runGPTLLM(request)
}

/**
 * Run GPT LLM
 */
async function runGPTLLM(request: LLMRequest): Promise<string> {
  const { systemPrompt, userMessage, context } = request

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    return completion.choices[0].message.content || 'I processed your request.'
  } catch (error) {
    console.error('GPT LLM error:', error)
    throw new Error(`GPT LLM error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Helper function to create tool definitions
 */
export function createTool(name: string, description: string, parameters: any): Tool {
  return {
    name,
    description,
    parameters: {
      type: 'object',
      properties: parameters,
      required: Object.keys(parameters).filter(key => 
        parameters[key].required !== false
      ),
    },
  }
} 