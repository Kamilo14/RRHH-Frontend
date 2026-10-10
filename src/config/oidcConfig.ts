import type { AuthProviderProps } from 'react-oidc-context'

const issuer = import.meta.env.VITE_COGNITO_ISSUER as string | undefined
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined
const redirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI || `${window.location.origin}/login`
const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN as string | undefined
const resolvedClientId = clientId || 'ujuivcn3okkjj63o05kfsous1'

export const oidcConfig: AuthProviderProps = {
  authority: issuer || 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_OyyaRU7Bx',
  client_id: resolvedClientId,
  redirect_uri: redirectUri,
  post_logout_redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'openid email profile',
  automaticSilentRenew: false,
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname)
  },
}

export function signOutRedirect(): void {
  const domain = cognitoDomain || 'https://us-east-1oyyaru7bx.auth.us-east-1.amazoncognito.com'
  const logoutUrl = new URL(`${domain.replace(/\/$/, '')}/logout`)
  logoutUrl.searchParams.set('client_id', resolvedClientId)
  logoutUrl.searchParams.set('logout_uri', redirectUri)
  window.location.assign(logoutUrl.toString())
}
