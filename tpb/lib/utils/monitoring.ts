import type { AuthError } from '../types/auth'

const ERROR_THRESHOLD = 5 // Number of errors before alerting
const ERROR_WINDOW = 5 * 60 * 1000 // 5 minutes in milliseconds

interface ErrorMetrics {
  count: number
  firstError: Date
  lastError: Date
}

const errorMetrics: Record<string, ErrorMetrics> = {}

export const monitorAuthError = (error: AuthError, userId?: string) => {
  const now = new Date()
  const errorKey = userId || 'anonymous'
  
  // Initialize or update error metrics
  if (!errorMetrics[errorKey]) {
    errorMetrics[errorKey] = {
      count: 1,
      firstError: now,
      lastError: now
    }
  } else {
    const metrics = errorMetrics[errorKey]
    
    // Reset if outside window
    if (now.getTime() - metrics.firstError.getTime() > ERROR_WINDOW) {
      errorMetrics[errorKey] = {
        count: 1,
        firstError: now,
        lastError: now
      }
    } else {
      metrics.count++
      metrics.lastError = now
      
      // Check if threshold is exceeded
      if (metrics.count >= ERROR_THRESHOLD) {
        handleErrorThresholdExceeded(errorKey, error, metrics)
        
        // Reset after alerting
        delete errorMetrics[errorKey]
      }
    }
  }
}

const handleErrorThresholdExceeded = (
  userId: string,
  lastError: AuthError,
  metrics: ErrorMetrics
) => {
  const alert = {
    type: 'auth_error_threshold_exceeded',
    userId,
    errorCount: metrics.count,
    timeWindow: `${ERROR_WINDOW / 1000 / 60} minutes`,
    firstError: metrics.firstError,
    lastError: metrics.lastError,
    lastErrorDetails: lastError
  }
  
  // Log the alert
  console.error('Auth Error Alert:', alert)
  
  // Here you could:
  // 1. Send to error tracking service (e.g., Sentry)
  // 2. Notify admin via email/Slack
  // 3. Trigger automated response (e.g., temporary IP block)
  
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to external monitoring service
    void sendToMonitoring(alert)
  }
}

const sendToMonitoring = async (alert: unknown) => {
  // Implementation would depend on your monitoring service
  // Example with generic fetch:
  try {
    if (!process.env.MONITORING_WEBHOOK_URL) return
    
    await fetch(process.env.MONITORING_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`
      },
      body: JSON.stringify(alert)
    })
  } catch (error) {
    console.error('Failed to send alert to monitoring service:', error)
  }
} 