const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export interface HealthResponse {
  status: string
}

export interface HelloResponse {
  message: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health')
  }

  async getHello(): Promise<HelloResponse> {
    return this.request<HelloResponse>('/api/hello')
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
