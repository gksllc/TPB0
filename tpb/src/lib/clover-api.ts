interface CloverApiOptions {
  method?: string
  headers?: Record<string, string>
  body?: string
}

class CloverApi {
  private baseUrl: string

  constructor() {
    this.baseUrl = '/api/clover'
  }

  private async request(endpoint: string, options: CloverApiOptions = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const defaultHeaders = {
      'Content-Type': 'application/json',
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      body: options.body,
    })

    return response
  }

  async get(endpoint: string) {
    return this.request(endpoint)
  }

  async post(endpoint: string, data: unknown) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put(endpoint: string, data: unknown) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE',
    })
  }
}

export const cloverApi = new CloverApi() 