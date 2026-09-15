import {
  MAX_IMAGE_FILE_SIZE,
  validateImageAsset,
  type ImageAssetCandidate,
} from '../image-validation'

describe('validateImageAsset', () => {
  it('accepts valid JPEG, PNG and WebP assets', () => {
    const jpegCandidate: ImageAssetCandidate = {
      uri: 'file:///data/photo.jpg',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024 * 500, // 500KB
      width: 1920,
      height: 1080,
    }

    const pngCandidate: ImageAssetCandidate = {
      uri: 'file:///data/screenshot.png',
      fileName: 'screenshot.png',
      mimeType: 'image/png',
      fileSize: 1024 * 800,
      width: 800,
      height: 600,
    }

    const webpCandidate: ImageAssetCandidate = {
      uri: 'file:///data/banner.webp',
      fileName: 'banner.webp',
      mimeType: 'image/webp',
      fileSize: 1024 * 300,
      width: 1200,
      height: 630,
    }

    const jpegResult = validateImageAsset(jpegCandidate)
    expect(jpegResult.valid).toBe(true)
    if (jpegResult.valid) {
      expect(jpegResult.sanitizedAsset.mimeType).toBe('image/jpeg')
      expect(jpegResult.sanitizedAsset.fileName).toBe('photo.jpg')
    }

    const pngResult = validateImageAsset(pngCandidate)
    expect(pngResult.valid).toBe(true)
    if (pngResult.valid) {
      expect(pngResult.sanitizedAsset.mimeType).toBe('image/png')
    }

    const webpResult = validateImageAsset(webpCandidate)
    expect(webpResult.valid).toBe(true)
    if (webpResult.valid) {
      expect(webpResult.sanitizedAsset.mimeType).toBe('image/webp')
    }
  })

  it('rejects HEIC and HEIF formats by extension and by MIME type', () => {
    const heicByExt: ImageAssetCandidate = {
      uri: 'file:///data/IMG_0001.HEIC',
      fileName: 'IMG_0001.HEIC',
      mimeType: 'image/heic',
      width: 4032,
      height: 3024,
    }

    const heifByMime: ImageAssetCandidate = {
      uri: 'file:///data/IMG_0002.heif',
      mimeType: 'image/heif',
      width: 4032,
      height: 3024,
    }

    const heicResult = validateImageAsset(heicByExt)
    expect(heicResult.valid).toBe(false)
    if (!heicResult.valid) {
      expect(heicResult.reason).toContain('HEIC/HEIF')
    }

    const heifResult = validateImageAsset(heifByMime)
    expect(heifResult.valid).toBe(false)
    if (!heifResult.valid) {
      expect(heifResult.reason).toContain('HEIC/HEIF')
    }
  })

  it('rejects video formats and unsupported file extensions', () => {
    const videoCandidate: ImageAssetCandidate = {
      uri: 'file:///data/video.mp4',
      fileName: 'video.mp4',
      mimeType: 'video/mp4',
      width: 1920,
      height: 1080,
    }

    const gifCandidate: ImageAssetCandidate = {
      uri: 'file:///data/animation.gif',
      fileName: 'animation.gif',
      mimeType: 'image/gif',
      width: 500,
      height: 500,
    }

    const svgCandidate: ImageAssetCandidate = {
      uri: 'file:///data/vector.svg',
      fileName: 'vector.svg',
      mimeType: 'image/svg+xml',
      width: 100,
      height: 100,
    }

    const videoResult = validateImageAsset(videoCandidate)
    expect(videoResult.valid).toBe(false)
    if (!videoResult.valid) {
      expect(videoResult.reason).toContain('Vídeos não são aceitos')
    }

    const gifResult = validateImageAsset(gifCandidate)
    expect(gifResult.valid).toBe(false)
    if (!gifResult.valid) {
      expect(gifResult.reason).toContain('Formato não suportado')
    }

    const svgResult = validateImageAsset(svgCandidate)
    expect(svgResult.valid).toBe(false)
  })

  it('rejects files larger than 10MB', () => {
    const largeCandidate: ImageAssetCandidate = {
      uri: 'file:///data/large.jpg',
      fileName: 'large.jpg',
      mimeType: 'image/jpeg',
      fileSize: MAX_IMAGE_FILE_SIZE + 1024, // 10MB + 1KB
      width: 4000,
      height: 3000,
    }

    const result = validateImageAsset(largeCandidate)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toContain('10MB')
    }
  })

  it('rejects invalid or extreme dimensions', () => {
    const zeroDimension: ImageAssetCandidate = {
      uri: 'file:///data/broken.jpg',
      fileName: 'broken.jpg',
      mimeType: 'image/jpeg',
      width: 0,
      height: 100,
    }

    const oversizedDimension: ImageAssetCandidate = {
      uri: 'file:///data/huge.png',
      fileName: 'huge.png',
      mimeType: 'image/png',
      width: 10000,
      height: 500,
    }

    const zeroResult = validateImageAsset(zeroDimension)
    expect(zeroResult.valid).toBe(false)

    const oversizedResult = validateImageAsset(oversizedDimension)
    expect(oversizedResult.valid).toBe(false)
    if (!oversizedResult.valid) {
      expect(oversizedResult.reason).toContain('Largura')
    }
  })
})
