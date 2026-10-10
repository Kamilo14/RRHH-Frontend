const gatewayUrl = (import.meta.env.VITE_API_GATEWAY_URL as string | undefined)?.replace(/\/+$/, '')

export const API_BASE = `${gatewayUrl || 'http://localhost:8080'}/api/v1`
