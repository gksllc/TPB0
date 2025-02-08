import { NextRequest } from 'next/server'

declare module 'next' {
  interface RouteHandlerContext {
    params: Record<string, string | string[]>
  }
}

export interface RouteSegmentConfig {
  dynamic?: 'auto' | 'force-dynamic' | 'error' | 'force-static'
  revalidate?: 'force-cache' | 0 | number
  runtime?: 'nodejs' | 'edge'
  preferredRegion?: 'auto' | 'global' | 'home' | string | string[]
}

export type RouteHandler = (
  request: NextRequest,
  context: RouteHandlerContext
) => Promise<Response> | Response 