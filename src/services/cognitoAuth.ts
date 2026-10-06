import { getRefreshToken, getSlug, saveSession } from './tokenStorage'

export class CognitoAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CognitoAuthError'
  }
}

export interface CognitoTokens {
  idToken: string
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface NewPasswordChallenge {
  challenge: 'NEW_PASSWORD_REQUIRED'
  session: string
  username: string
}

interface CognitoAuthResult {
  AuthenticationResult?: {
    IdToken?: string
    AccessToken?: string
    RefreshToken?: string
    ExpiresIn?: number
  }
  ChallengeName?: string
  Session?: string
  __type?: string
  message?: string
}

function requirePublicClient(): { region: string; clientId: string } {
  const region = import.meta.env.VITE_COGNITO_REGION as string | undefined
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined
  if (!region || !clientId) {
    throw new CognitoAuthError(
      'Falta VITE_COGNITO_REGION o VITE_COGNITO_CLIENT_ID. Usa un app client público, sin client secret.',
    )
  }
  return { region, clientId }
}

async function cognito(target: string, body: unknown): Promise<CognitoAuthResult> {
  const { region } = requirePublicClient()
  const response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  })
  const payload = (await response.json()) as CognitoAuthResult
  if (!response.ok) {
    throw new CognitoAuthError(mapCognitoError(payload))
  }
  return payload
}

function mapCognitoError(payload: CognitoAuthResult): string {
  const type = payload.__type ?? ''
  const message = payload.message ?? ''
  if (message.toLowerCase().includes('secret hash') || (type.includes('NotAuthorizedException') && message.toLowerCase().includes('secret'))) {
    return 'Este app client tiene client secret. La SPA necesita un client público, sin secret, con ALLOW_USER_PASSWORD_AUTH y ALLOW_REFRESH_TOKEN_AUTH.'
  }
  if (type.includes('NotAuthorizedException') || message.includes('Incorrect username or password')) {
    return 'Correo o contraseña incorrectos.'
  }
  if (type.includes('UserNotConfirmedException')) {
    return 'El usuario no está confirmado en Cognito.'
  }
  if (type.includes('PasswordResetRequiredException')) {
    return 'Debes restablecer la contraseña antes de ingresar.'
  }
  return message || 'No se pudo iniciar sesión en Cognito.'
}

function readTokens(result: CognitoAuthResult, previousRefresh?: string | null): CognitoTokens {
  const auth = result.AuthenticationResult
  if (!auth?.IdToken || !auth.AccessToken || !auth.ExpiresIn) {
    throw new CognitoAuthError('Cognito no devolvió tokens.')
  }
  const refreshToken = auth.RefreshToken || previousRefresh
  if (!refreshToken) {
    throw new CognitoAuthError('Cognito no devolvió refresh token. Revisa ALLOW_REFRESH_TOKEN_AUTH en el app client.')
  }
  return {
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    refreshToken,
    expiresIn: auth.ExpiresIn,
  }
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<CognitoTokens | NewPasswordChallenge> {
  const { clientId } = requirePublicClient()
  const result = await cognito('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email.trim(),
      PASSWORD: password,
    },
  })
  if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED' && result.Session) {
    return { challenge: 'NEW_PASSWORD_REQUIRED', session: result.Session, username: email.trim() }
  }
  return readTokens(result)
}

export async function completeNewPassword(
  username: string,
  session: string,
  newPassword: string,
): Promise<CognitoTokens> {
  const { clientId } = requirePublicClient()
  const result = await cognito('RespondToAuthChallenge', {
    ChallengeName: 'NEW_PASSWORD_REQUIRED',
    ClientId: clientId,
    Session: session,
    ChallengeResponses: {
      USERNAME: username,
      NEW_PASSWORD: newPassword,
    },
  })
  return readTokens(result)
}

let refreshInFlight: Promise<string | null> | null = null

export function refreshIdToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  const slug = getSlug()
  if (!refreshToken || !slug) return null
  try {
    const { clientId } = requirePublicClient()
    const result = await cognito('InitiateAuth', {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: clientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    })
    const tokens = readTokens(result, refreshToken)
    saveSession({
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expiresIn,
      slug,
    })
    return tokens.idToken
  } catch {
    return null
  }
}

export function persistLogin(tokens: CognitoTokens, slug: string): void {
  saveSession({
    idToken: tokens.idToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + tokens.expiresIn,
    slug,
  })
}
