import { z } from 'zod'

const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:'])

export function isSafeHttpUrl(value: string): boolean {
  try {
    return SAFE_URL_PROTOCOLS.has(new URL(value).protocol)
  } catch {
    return false
  }
}

export const SafeHttpUrlSchema = z
  .string()
  .url()
  .refine(isSafeHttpUrl, 'URL must use http or https')
