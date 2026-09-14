import type { operations } from './schema'
import { rotateSessionRequest } from './session'

type CreateResponse = operations['createTenant']['responses'][201]['content']['application/json']
type SwitchResponse = operations['switchTenant']['responses'][200]['content']['application/json']
type CreateRequest = Omit<operations['createTenant']['requestBody']['content']['application/json'], 'refresh_token'>
type SwitchRequest = Omit<operations['switchTenant']['requestBody']['content']['application/json'], 'refresh_token'>

/** Credentials are selected inside the queue and never returned to UI/cache consumers. */
export async function createTenant(body: CreateRequest) {
  const result = await rotateSessionRequest<CreateResponse>('/api/v1/tenants', { name: body.name })
  return result.tenant
}

export async function switchTenant(body: SwitchRequest) {
  const result = await rotateSessionRequest<SwitchResponse>('/api/v1/tenants/switch', { tenant_id: body.tenant_id })
  return result.tenant
}
