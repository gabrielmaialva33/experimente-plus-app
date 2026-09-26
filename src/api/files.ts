import { File } from 'expo-file-system'

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
  // expo/fetch, installed as the global fetch, sends only Blob parts; see
  // uploadReviewPhoto for why React Native's { uri, name, type } object fails.
  formData.append('file', new File(file.uri), file.name)

  return request<FileUploadResponse>('/api/v1/files/upload', {
    method: 'POST',
    authenticated: true,
    body: formData,
  })
}
