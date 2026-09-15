export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_IMAGE_DIMENSION = 8192
export const MIN_IMAGE_DIMENSION = 1

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const

export const REJECTED_IMAGE_EXTENSIONS = [
  '.heic',
  '.heif',
  '.svg',
  '.gif',
  '.mp4',
  '.mov',
  '.avi',
  '.pdf',
  '.doc',
  '.docx',
] as const

export interface ImageAssetCandidate {
  uri: string
  fileName?: string | null
  mimeType?: string | null
  fileSize?: number | null
  width?: number | null
  height?: number | null
}

export type ImageValidationResult =
  | { valid: true; sanitizedAsset: ValidatedImageAsset }
  | { valid: false; reason: string }

export interface ValidatedImageAsset {
  uri: string
  fileName: string
  mimeType: string
  fileSize?: number
  width: number
  height: number
}

function extractExtension(uriOrName: string): string {
  const clean = uriOrName.split('?')[0].split('#')[0]
  const lastDot = clean.lastIndexOf('.')
  return lastDot !== -1 ? clean.slice(lastDot).toLowerCase() : ''
}

function inferMimeType(extension: string): string | undefined {
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    default:
      return undefined
  }
}

/**
 * Validates image format, size, and dimensions against backend constraints.
 * Concretizes ADR 0014 and ADR 0027: accepts JPEG, PNG, WebP; rejects HEIC/HEIF and videos.
 */
export function validateImageAsset(asset: ImageAssetCandidate): ImageValidationResult {
  const ext = extractExtension(asset.fileName || asset.uri)
  const mime = asset.mimeType?.toLowerCase()

  // Explicit rejection of HEIC / HEIF
  if (ext === '.heic' || ext === '.heif' || mime === 'image/heic' || mime === 'image/heif') {
    return {
      valid: false,
      reason: 'Formato HEIC/HEIF não é aceito. Escolha fotos em JPEG, PNG ou WebP.',
    }
  }

  // Explicit rejection of videos
  if (mime?.startsWith('video/') || ext === '.mp4' || ext === '.mov' || ext === '.avi') {
    return {
      valid: false,
      reason: 'Vídeos não são aceitos. Selecione apenas fotos.',
    }
  }

  // Check allowed extensions and mime types
  const isAllowedExt = ALLOWED_IMAGE_EXTENSIONS.includes(ext as (typeof ALLOWED_IMAGE_EXTENSIONS)[number])
  const isAllowedMime = mime
    ? ALLOWED_IMAGE_MIME_TYPES.includes(mime as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])
    : false

  if (!isAllowedExt && !isAllowedMime) {
    return {
      valid: false,
      reason: 'Formato não suportado. Aceito apenas JPEG, PNG e WebP.',
    }
  }

  // File size validation (10MB limit)
  if (asset.fileSize != null && asset.fileSize > MAX_IMAGE_FILE_SIZE) {
    return {
      valid: false,
      reason: 'A imagem excede o tamanho máximo de 10MB.',
    }
  }

  // Dimension validation
  if (asset.width != null && (asset.width < MIN_IMAGE_DIMENSION || asset.width > MAX_IMAGE_DIMENSION)) {
    return {
      valid: false,
      reason: `Largura da imagem deve estar entre ${MIN_IMAGE_DIMENSION}px e ${MAX_IMAGE_DIMENSION}px.`,
    }
  }

  if (asset.height != null && (asset.height < MIN_IMAGE_DIMENSION || asset.height > MAX_IMAGE_DIMENSION)) {
    return {
      valid: false,
      reason: `Altura da imagem deve estar entre ${MIN_IMAGE_DIMENSION}px e ${MAX_IMAGE_DIMENSION}px.`,
    }
  }

  const normalizedExt = isAllowedExt
    ? ext
    : mime === 'image/png'
      ? '.png'
      : mime === 'image/webp'
        ? '.webp'
        : '.jpg'

  const defaultName = `photo-${Date.now()}${normalizedExt}`
  const normalizedMime = mime && isAllowedMime ? mime : (inferMimeType(normalizedExt) ?? 'image/jpeg')

  return {
    valid: true,
    sanitizedAsset: {
      uri: asset.uri,
      fileName: asset.fileName || defaultName,
      mimeType: normalizedMime,
      fileSize: asset.fileSize ?? undefined,
      width: asset.width ?? 0,
      height: asset.height ?? 0,
    },
  }
}
