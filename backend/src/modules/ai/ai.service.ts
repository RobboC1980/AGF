import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

interface AIStoryRequest {
  epicName: string
  projectName?: string
  projectType?: string
  userPersona?: string
}

interface AIStoryResponse {
  suggestions: string[]
  provider: string
  model: string
  confidence: number
}

class AIService {
  private openai: OpenAI | null = null
  private anthropic: Anthropic | null = null
  private provider: string

  constructor() {
    this.provider = process.env.AI_PROVIDER || 'openai'
    
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    }

    // Initialize Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      })
    }
  }

  async generateUserStories(request: AIStoryRequest): Promise<AIStoryResponse> {
    try {
      // Try primary provider first
      if (this.provider === 'openai' && this.openai) {
        return await this.generateWithOpenAI(request)
      } else if (this.provider === 'anthropic' && this.anthropic) {
        return await this.generateWithAnthropic(request)
      }
      
      // Fallback to other provider
      if (this.openai) {
        return await this.generateWithOpenAI(request)
      } else if (this.anthropic) {
        return await this.generateWithAnthropic(request)
      }
      
      // Ultimate fallback to template-based generation
      return this.generateWithTemplates(request)
    } catch (error) {
      console.warn('AI generation failed, falling back to templates:', error)
      return this.generateWithTemplates(request)
    }
  }

  private async generateWithOpenAI(request: AIStoryRequest): Promise<AIStoryResponse> {
    if (!this.openai) throw new Error('OpenAI not initialized')

    const prompt = this.buildPrompt(request)
    
    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert agile coach and product manager. Generate exactly 3 user stories following the "As a [user], I want [functionality] so that [benefit]" format. 

Rules:
- Each story must be a single, complete sentence
- Focus on clear, specific language
- User-centered perspective
- Measurable value

Return ONLY 3 user stories, one per line, no additional formatting or JSON.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '300'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
    })

    const content = completion.choices[0]?.message?.content
    if (!content) throw new Error('No content received from OpenAI')

    // Extract user stories from the response
    let suggestions: string[]
    
    // Try to find "As a..." patterns first
    const storyMatches = content.match(/As a [^.]+\./g)
    if (storyMatches && storyMatches.length >= 3) {
      suggestions = storyMatches.slice(0, 3)
    } else {
      // Fallback: split by lines and filter for story patterns
      const lines = content.split('\n').filter(line => 
        line.trim().length > 20 && 
        (line.toLowerCase().includes('as a') || line.toLowerCase().includes('user'))
      )
      suggestions = lines.slice(0, 3)
      
      // Ultimate fallback: use templates if AI parsing fails
      if (suggestions.length < 3) {
        return this.generateWithTemplates(request)
      }
    }

    // Clean up the suggestions
    suggestions = suggestions.map(story => 
      story.trim()
        .replace(/^\d+\.?\s*/, '') // Remove numbering
        .replace(/^[-*]\s*/, '')   // Remove bullets
        .replace(/"/g, '')         // Remove quotes
    )

    return {
      suggestions: suggestions.slice(0, 3),
      provider: 'openai',
      model: completion.model,
      confidence: 0.9
    }
  }

  private async generateWithAnthropic(request: AIStoryRequest): Promise<AIStoryResponse> {
    if (!this.anthropic) throw new Error('Anthropic not initialized')

    const prompt = this.buildPrompt(request)
    
    const message = await this.anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '500'),
      messages: [
        {
          role: 'user',
          content: `You are an expert agile coach. Generate exactly 3 professional user stories in this format:

As a [user type], I want [specific functionality] so that [clear benefit].

Context: ${prompt}

Requirements:
- Follow agile best practices
- Be specific and measurable
- Focus on user value
- Use professional language
- Return as JSON: {"stories": ["As a...", "As a...", "As a..."]}`
        }
      ]
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type from Anthropic')

    // Try to parse JSON, fallback to text extraction
    let suggestions: string[]
    try {
      const parsed = JSON.parse(content.text)
      suggestions = Array.isArray(parsed.stories) ? parsed.stories : 
                   Array.isArray(parsed) ? parsed : 
                   [content.text]
    } catch {
      // Extract stories from text response
      const storyMatches = content.text.match(/As a .+? so that .+?\./g)
      suggestions = storyMatches?.slice(0, 3) || [content.text]
    }

    return {
      suggestions: suggestions.slice(0, 3),
      provider: 'anthropic',
      model: message.model,
      confidence: 0.85
    }
  }

  private generateWithTemplates(request: AIStoryRequest): AIStoryResponse {
    const { epicName, projectName } = request
    
    // Enhanced template-based generation as fallback
    const templates = [
      `As a ${this.getUserType(projectName)}, I want to ${this.getAction(epicName)} so that I can ${this.getBenefit(epicName, 'productivity')}.`,
      `As a ${this.getUserType(projectName, 'stakeholder')}, I want to ${this.getAction(epicName, 'manage')} so that I can ${this.getBenefit(epicName, 'insights')}.`,
      `As a ${this.getUserType(projectName, 'team member')}, I want to ${this.getAction(epicName, 'collaborate')} so that I can ${this.getBenefit(epicName, 'efficiency')}.`
    ]

    return {
      suggestions: templates,
      provider: 'templates',
      model: 'rule-based',
      confidence: 0.7
    }
  }

  private buildPrompt(request: AIStoryRequest): string {
    const { epicName, projectName, projectType, userPersona } = request
    
    return `
Generate user stories for:
- Epic: "${epicName}"
- Project: "${projectName || 'Software Project'}"
- Project Type: ${projectType || 'Business Application'}
- Primary User: ${userPersona || 'End User'}

Focus on practical, implementable functionality that delivers clear business value.
Consider different user types: end users, administrators, stakeholders.
Each story should be independent and deliverable within a sprint.
`
  }

  private getUserType(projectName?: string, fallback: string = 'user'): string {
    if (!projectName) return fallback
    
    const name = projectName.toLowerCase()
    if (name.includes('admin')) return 'administrator'
    if (name.includes('customer')) return 'customer'
    if (name.includes('manager')) return 'manager'
    if (name.includes('employee')) return 'employee'
    return fallback
  }

  private getAction(epicName: string, prefix?: string): string {
    const name = epicName.toLowerCase()
    const baseAction = prefix ? `${prefix} ` : ''
    
    if (name.includes('login') || name.includes('auth')) return `${baseAction}securely authenticate`
    if (name.includes('dashboard')) return `${baseAction}view my personalized dashboard`
    if (name.includes('create')) return `${baseAction}create and manage content`
    if (name.includes('search')) return `${baseAction}find information quickly`
    if (name.includes('report')) return `${baseAction}generate comprehensive reports`
    if (name.includes('notification')) return `${baseAction}receive timely notifications`
    
    return `${baseAction}utilize ${epicName}`
  }

  private getBenefit(epicName: string, type: 'productivity' | 'insights' | 'efficiency' = 'productivity'): string {
    const name = epicName.toLowerCase()
    
    if (name.includes('login')) return 'access my personalized workspace'
    if (name.includes('dashboard')) return 'make informed decisions quickly'
    if (name.includes('report')) return 'track progress and performance'
    if (name.includes('search')) return 'complete tasks efficiently'
    
    switch (type) {
      case 'insights': return 'gain valuable insights'
      case 'efficiency': return 'work more efficiently'
      default: return 'achieve my objectives'
    }
  }

  async generateEpic(request: { projectName: string; description: string; goals?: string[]; constraints?: string[] }): Promise<any> {
    // Template-based epic generation for now
    const { projectName, description, goals = [], constraints = [] } = request
    
    return {
      name: `${projectName} Epic`,
      description: `Epic for ${description}`,
      goals: goals.length > 0 ? goals : [`Deliver ${description}`, `Improve user experience`, `Ensure system reliability`],
      constraints: constraints.length > 0 ? constraints : [`Budget limitations`, `Timeline constraints`, `Technical dependencies`],
      provider: 'templates',
      confidence: 0.7
    }
  }

  async generateTasks(request: { storyTitle: string; storyDescription: string; acceptanceCriteria?: string[]; technicalRequirements?: string[] }): Promise<any> {
    // Template-based task generation for now
    const { storyTitle, storyDescription, acceptanceCriteria = [], technicalRequirements = [] } = request
    
    const tasks = [
      `Design UI components for ${storyTitle}`,
      `Implement backend logic for ${storyDescription}`,
      `Write unit tests for ${storyTitle}`,
      `Perform integration testing`,
      `Update documentation`
    ]

    return {
      tasks: tasks.map((task, index) => ({
        id: index + 1,
        title: task,
        description: `Task related to: ${storyDescription}`,
        estimatedHours: Math.floor(Math.random() * 8) + 1,
        priority: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)]
      })),
      provider: 'templates',
      confidence: 0.7
    }
  }

  // Health check method
  async checkAIProviders(): Promise<{ openai: boolean; anthropic: boolean; active: string }> {
    return {
      openai: !!this.openai,
      anthropic: !!this.anthropic,
      active: this.provider
    }
  }
}

export const aiService = new AIService()
export { AIStoryRequest, AIStoryResponse } 