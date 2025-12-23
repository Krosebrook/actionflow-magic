// Request size limits for different edge functions
export const REQUEST_SIZE_LIMITS = {
  'transcribe-audio': 50 * 1024 * 1024, // 50MB for audio files
  'extract-action-items': 1 * 1024 * 1024, // 1MB for transcripts
  'teams-webhook': 100 * 1024, // 100KB for webhook payloads
  default: 1 * 1024 * 1024, // 1MB default
};

export interface SizeLimitResult {
  allowed: boolean;
  size: number;
  limit: number;
}

export function checkRequestSize(
  contentLength: number | null,
  functionName: string
): SizeLimitResult {
  const limit = REQUEST_SIZE_LIMITS[functionName as keyof typeof REQUEST_SIZE_LIMITS] || REQUEST_SIZE_LIMITS.default;
  const size = contentLength || 0;
  
  return {
    allowed: size <= limit,
    size,
    limit,
  };
}

export function getContentLength(req: Request): number | null {
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const parsed = parseInt(contentLength, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
