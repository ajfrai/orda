/**
 * URL validation and security checks for PDF menu uploads
 * Prevents SSRF attacks and ensures valid public URLs
 */

interface ValidationResult {
  valid: boolean;
  error?: string;
  url?: URL;
}

// Private IP ranges to block (SSRF protection)
const PRIVATE_IP_PATTERNS = [
  /^127\./,                    // Loopback
  /^10\./,                     // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private Class B
  /^192\.168\./,               // Private Class C
  /^169\.254\./,               // Link-local
  /^::1$/,                     // IPv6 loopback
  /^fc00:/,                    // IPv6 private
  /^fe80:/,                    // IPv6 link-local
  /^localhost$/i,              // Localhost hostname
];

// Dangerous hostnames to block
const BLOCKED_HOSTNAMES = [
  'localhost',
  '0.0.0.0',
  'metadata.google.internal', // GCP metadata
  '169.254.169.254',          // AWS/Azure metadata
];

/**
 * Validate a PDF URL with security checks
 * @param urlString - The URL to validate
 * @returns Validation result with error message if invalid
 */
export function validatePdfUrl(urlString: string): ValidationResult {
  // Check if URL is provided
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  // Trim whitespace
  const trimmed = urlString.trim();

  // Check if empty after trim
  if (trimmed.length === 0) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  // Check length (reasonable limit)
  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL is too long (max 2048 characters)' };
  }

  // Parse URL
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Check protocol (only HTTP/HTTPS)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      valid: false,
      error: 'Only HTTP and HTTPS protocols are allowed',
    };
  }

  // Check if hostname exists
  if (!url.hostname) {
    return { valid: false, error: 'URL must have a valid hostname' };
  }

  // Block localhost and private hostnames
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return {
      valid: false,
      error: 'Access to local or private resources is not allowed',
    };
  }

  // Block private IP addresses
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        error: 'Access to private IP addresses is not allowed',
      };
    }
  }

  // Check file extension (PDF or image formats)
  const pathname = url.pathname.toLowerCase();
  const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const hasValidExtension = validExtensions.some(ext =>
    pathname.endsWith(ext) || pathname.includes(`${ext}?`)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'URL must point to a PDF or image file (.pdf, .jpg, .png, etc.)',
    };
  }

  // All checks passed
  return { valid: true, url };
}

/**
 * Sanitize URL for safe display (hide query params that might contain tokens)
 * @param urlString - The URL to sanitize
 * @returns Sanitized URL string safe for logging/display
 */
export function sanitizeUrlForDisplay(urlString: string): string {
  try {
    const url = new URL(urlString);
    // Remove query params and hash for privacy
    return `${url.protocol}//${url.hostname}${url.pathname}`;
  } catch {
    return '[invalid URL]';
  }
}

/**
 * Extract filename from URL
 * @param urlString - The URL to extract filename from
 * @returns Filename or null if cannot be determined
 */
export function extractFilename(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    const pathname = url.pathname;
    const parts = pathname.split('/');
    const filename = parts[parts.length - 1];
    return filename || null;
  } catch {
    return null;
  }
}
