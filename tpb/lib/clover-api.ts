interface CloverApiOptions {
  method?: string
  headers?: Record<string, string>
  body?: string
  retries?: number
  cacheDuration?: number
  bypassCache?: boolean
}

interface CacheEntry {
  data: any
  timestamp: number
}

class CloverApi {
  private baseUrl: string
  private requestQueue: Map<string, Promise<any>>
  private cache: Map<string, CacheEntry>
  private retryDelay: number = 1000 // Base delay of 1 second
  private maxRetryDelay: number = 30000 // Maximum delay of 30 seconds
  private defaultCacheDuration: number = 5 * 60 * 1000 // 5 minutes default cache

  constructor() {
    this.baseUrl = '/api/clover'
    this.requestQueue = new Map()
    this.cache = new Map()
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private getQueueKey(endpoint: string, options: CloverApiOptions): string {
    return `${options.method || 'GET'}-${endpoint}`
  }

  private getCacheKey(endpoint: string, options: CloverApiOptions): string {
    return `${options.method || 'GET'}-${endpoint}-${options.body || ''}`
  }

  private isCacheValid(cacheEntry: CacheEntry, cacheDuration: number): boolean {
    return Date.now() - cacheEntry.timestamp < cacheDuration
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.retryDelay * Math.pow(2, retryCount),
      this.maxRetryDelay
    )
    // Add random jitter between 0-1000ms to prevent thundering herd
    const jitter = Math.random() * 1000
    return exponentialDelay + jitter
  }

  private async request(endpoint: string, options: CloverApiOptions = {}): Promise<any> {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${this.baseUrl}${path}`
    const queueKey = this.getQueueKey(endpoint, options)
    const cacheKey = this.getCacheKey(endpoint, options)
    
    // Check cache for GET requests if not bypassing cache
    if (!options.bypassCache && (options.method === undefined || options.method === 'GET')) {
      const cacheDuration = options.cacheDuration ?? this.defaultCacheDuration
      const cachedData = this.cache.get(cacheKey)
      
      if (cachedData && this.isCacheValid(cachedData, cacheDuration)) {
        return cachedData.data
      }
    }

    // Check if there's already a request in progress
    const existingRequest = this.requestQueue.get(queueKey)
    if (existingRequest) {
      return existingRequest
    }

    const executeRequest = async (retryCount = 0): Promise<any> => {
      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: options.body,
        })

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10)
          const delay = Math.max(retryAfter * 1000, this.calculateRetryDelay(retryCount))
          console.log(`Rate limited, waiting ${delay}ms before retry ${retryCount + 1}`)
          await this.sleep(delay)
          return executeRequest(retryCount + 1)
        }

        const responseData = await response.json()

        if (!response.ok) {
          throw new Error(
            responseData?.error || responseData?.message || 
            `API request failed: ${response.status} ${response.statusText}`
          )
        }

        // Cache successful GET responses
        if (!options.bypassCache && (options.method === undefined || options.method === 'GET')) {
          this.cache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
          })
        }

        return responseData
      } catch (error) {
        const maxRetries = options.retries || 3
        if (retryCount < maxRetries) {
          const delay = this.calculateRetryDelay(retryCount)
          console.log(`Request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)
          await this.sleep(delay)
          return executeRequest(retryCount + 1)
        }
        throw error
      }
    }

    try {
      const requestPromise = executeRequest()
      this.requestQueue.set(queueKey, requestPromise)
      return await requestPromise
    } finally {
      this.requestQueue.delete(queueKey)
    }
  }

  async get(endpoint: string, options: Omit<CloverApiOptions, 'method'> = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  async post(endpoint: string, data: unknown, options: Omit<CloverApiOptions, 'method' | 'body'> = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async put(endpoint: string, data: unknown, options: Omit<CloverApiOptions, 'method' | 'body'> = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async delete(endpoint: string, options: Omit<CloverApiOptions, 'method'> = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE'
    })
  }

  clearCache() {
    this.cache.clear()
  }

  clearCacheForEndpoint(endpoint: string) {
    const prefix = `GET-${endpoint}`
    Array.from(this.cache.keys()).forEach(key => {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    })
  }
}

export const cloverApi = new CloverApi() 