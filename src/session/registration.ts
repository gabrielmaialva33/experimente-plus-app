import type { SignUpRequest } from '@/api/auth'

export type RegistrationFields = Omit<SignUpRequest, 'terms_accepted' | 'username'> & { username: string }
export type RegistrationErrors = Partial<Record<keyof SignUpRequest, string>>

export const emptyRegistration: RegistrationFields = {
  full_name: '', email: '', username: '', password: '', password_confirmation: '',
}

/** Mirrors users_validator.ts; uniqueness and final validation remain server-owned. */
export function registrationErrors(fields: RegistrationFields): RegistrationErrors {
  const errors: RegistrationErrors = {}
  const name = fields.full_name.trim()
  const email = fields.email.trim()
  const username = fields.username.trim().toLowerCase()
  if (!name || name.length > 255) errors.full_name = 'Informe seu nome, com até 255 caracteres.'
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Informe um e-mail válido, com até 254 caracteres.'
  if (username && (username.length < 3 || username.length > 80 || !/^[a-z0-9][a-z0-9._-]*$/.test(username))) {
    errors.username = 'Use de 3 a 80 caracteres: letras, números, ponto, hífen ou sublinhado. Comece com letra ou número.'
  }
  if (fields.password.length < 8) errors.password = 'Use uma senha com pelo menos 8 caracteres.'
  if (!fields.password_confirmation || fields.password_confirmation !== fields.password) {
    errors.password_confirmation = 'As senhas precisam ser iguais.'
  }
  return errors
}

/** Do not echo arbitrary server messages: they may contain submitted values. */
export function registrationServerErrors(body: unknown): RegistrationErrors {
  const result: RegistrationErrors = {}
  if (!body || typeof body !== 'object' || !('errors' in body) || !Array.isArray(body.errors)) return result
  for (const error of body.errors) {
    if (!error || typeof error !== 'object') continue
    const field = error.rule === 'confirmed' && error.field === 'password' ? 'password_confirmation' : error.field
    if (!(field in emptyRegistration) && field !== 'terms_accepted') continue
    if (field === 'email') result.email = error.rule === 'database.unique' ? 'Este e-mail já está cadastrado. Entre na sua conta.' : 'Confira o e-mail informado.'
    else if (field === 'username') result.username = error.rule === 'database.unique' ? 'Este usuário já está em uso. Escolha outro.' : 'Confira o usuário informado.'
    else if (field === 'full_name') result.full_name = 'Confira o nome informado.'
    else if (field === 'password') result.password = 'Confira a senha: use pelo menos 8 caracteres.'
    else if (field === 'password_confirmation') result.password_confirmation = 'As senhas precisam ser iguais.'
    else if (field === 'terms_accepted') result.terms_accepted = 'Leia e aceite os Termos de Uso e a Política de Privacidade.'
  }
  return result
}
