import { request } from './client'
import type { components } from './schema'

export type FileUploadResponse = components['schemas']['FileUploadResponse']

export interface UploadFileInput {
  uri: string
  name: string
  type: string
}

/**
 * Uploads a validated file to the server via multipart/form-data.
 * Concretizes POST /api/v1/files/upload with authenticated session credentials.
 */
export async function uploadFile(file: UploadFileInput): Promise<FileUploadResponse> {
  const formData = new FormData()
  // React Native FormData accepts an object with uri, name and type for binary fields
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob)

  return request<FileUploadResponse>('/api/v1/files/upload', {
    method: 'POST',
    authenticated: true,
    body: formData,
  })
}
