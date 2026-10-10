import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js'

const issuer = import.meta.env.VITE_COGNITO_ISSUER as string | undefined
const poolId = (import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined)
  || issuer?.split('/').pop()
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined

if (!poolId || !clientId) {
  throw new Error('Falta configurar VITE_COGNITO_USER_POOL_ID y VITE_COGNITO_CLIENT_ID.')
}

const userPool = new CognitoUserPool({
  UserPoolId: poolId,
  ClientId: clientId,
})

export type CognitoSignUpData = {
  email: string
  password: string
  name: string
  phone: string
}

export type NewPasswordChallenge = {
  complete: (password: string) => Promise<string>
}

export type AuthenticateResult =
  | { kind: 'authenticated'; token: string }
  | { kind: 'new-password'; challenge: NewPasswordChallenge }

export function signUp(data: CognitoSignUpData): Promise<void> {
  const attributes = [
    new CognitoUserAttribute({ Name: 'email', Value: data.email }),
    new CognitoUserAttribute({ Name: 'name', Value: data.name }),
  ]
  if (data.phone.trim()) {
    attributes.push(new CognitoUserAttribute({ Name: 'phone_number', Value: data.phone.trim() }))
  }

  return new Promise((resolve, reject) => {
    userPool.signUp(data.email, data.password, attributes, [], (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  const user = new CognitoUser({ Username: email, Pool: userPool })
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

export function authenticate(email: string, password: string): Promise<AuthenticateResult> {
  const user = new CognitoUser({ Username: email, Pool: userPool })
  const details = new AuthenticationDetails({ Username: email, Password: password })

  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (session: CognitoUserSession) => resolve({
        kind: 'authenticated',
        token: session.getIdToken().getJwtToken(),
      }),
      onFailure: reject,
      newPasswordRequired: () => resolve({
        kind: 'new-password',
        challenge: {
          complete: (newPassword: string) => new Promise((completeResolve, completeReject) => {
            user.completeNewPasswordChallenge(newPassword, {}, {
              onSuccess: (session: CognitoUserSession) => completeResolve(session.getIdToken().getJwtToken()),
              onFailure: completeReject,
            })
          }),
        },
      }),
    })
  })
}
