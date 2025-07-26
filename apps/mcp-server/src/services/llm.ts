import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

interface Tool {
  name: string
  description: string
  parameters: any
}

interface ToolFunction {
  [key: string]: (params: any) => Promise<any>
}

interface LLMRequest {
  systemPrompt: string
  userMessage: string
  context: any
  tools: Tool[]
  toolFunctions: ToolFunction
}

// Initialize LLM clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function runBeckyLLM(request: LLMRequest): Promise<string> {
  const { systemPrompt, userMessage, context, tools, toolFunctions } = request

  try {
    // Use Claude if available, otherwise fallback to GPT
    if (process.env.ANTHROPIC_API_KEY) {
      return await runClaude(systemPrompt, userMessage, tools, toolFunctions)
    } else if (process.env.OPENAI_API_KEY) {
      return await runGPT(systemPrompt, userMessage, tools, toolFunctions)
    } else {
      throw new Error('No LLM API key configured')
    }
  } catch (error) {
    console.error('LLM error:', error)
    return "I'm sorry, I'm having trouble processing your request right now. Please try again later."
  }
}

async function runClaude(
  systemPrompt: string,
  userMessage: string,
  tools: Tool[],
  toolFunctions: ToolFunction
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    })),
  })

  const response = message.content[0]
  
  if (response.type === 'tool_use') {
    const toolName = response.name
    const toolParams = response.input
    
    if (toolFunctions[toolName]) {
      try {
        const toolResult = await toolFunctions[toolName](toolParams)
        
        // Send tool result back to Claude
        const followUpMessage = await anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userMessage,
            },
            {
              role: 'assistant',
              content: response,
            },
            {
              role: 'user',
              content: `Tool result: ${JSON.stringify(toolResult)}`,
            },
          ],
        })
        
        return followUpMessage.content[0].text
      } catch (error) {
        console.error('Tool execution error:', error)
        return "I'm sorry, I encountered an error while processing your request. Please try again."
      }
    }
  }
  
  return response.text
}

async function runGPT(
  systemPrompt: string,
  userMessage: string,
  tools: Tool[],
  toolFunctions: ToolFunction
): Promise<string> {
  const response = await openai.chat.completions.create({
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
    tools: tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })),
    tool_choice: 'auto',
  })

  const message = response.choices[0].message
  
  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolCall = message.tool_calls[0]
    const toolName = toolCall.function.name
    const toolParams = JSON.parse(toolCall.function.arguments)
    
    if (toolFunctions[toolName]) {
      try {
        const toolResult = await toolFunctions[toolName](toolParams)
        
        // Send tool result back to GPT
        const followUpResponse = await openai.chat.completions.create({
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
            {
              role: 'assistant',
              content: message.content || '',
              tool_calls: message.tool_calls,
            },
            {
              role: 'tool',
              content: JSON.stringify(toolResult),
              tool_call_id: toolCall.id,
            },
          ],
        })
        
        return followUpResponse.choices[0].message.content || ''
      } catch (error) {
        console.error('Tool execution error:', error)
        return "I'm sorry, I encountered an error while processing your request. Please try again."
      }
    }
  }
  
  return message.content || ''
} 