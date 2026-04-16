const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'

export function corsHeaders(origin) {
  // Allow the configured origin, plus localhost for dev
  let allowedOrigin = ALLOWED_ORIGIN
  if (origin && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
    allowedOrigin = origin
  }
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
}

export function handleOptions(origin) {
  return {
    statusCode: 204,
    headers: corsHeaders(origin),
    body: '',
  }
}
