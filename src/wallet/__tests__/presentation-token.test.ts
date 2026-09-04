import { extractPresentationToken } from '../presentation-token'

const TOKEN = `${'a'.repeat(20)}.${'b'.repeat(43)}`

describe('extractPresentationToken', () => {
  it('accepts a bare token, so a partner can type one in', () => {
    expect(extractPresentationToken(TOKEN)).toBe(TOKEN)
    expect(extractPresentationToken(`  ${TOKEN}  `)).toBe(TOKEN)
  })

  it('takes the token out of the validation URL the QR carries', () => {
    const url = `https://experimente.test/portal/redemptions/validate?token=${TOKEN}`
    expect(extractPresentationToken(url)).toBe(TOKEN)
  })

  it('refuses anything that is not http(s), so a scanned code cannot pick the scheme', () => {
    for (const scheme of ['javascript', 'file', 'intent', 'content', 'ftp']) {
      expect(extractPresentationToken(`${scheme}://x/?token=${TOKEN}`)).toBeNull()
    }
  })

  it('refuses a URL without a token and a token of the wrong shape', () => {
    expect(extractPresentationToken('https://experimente.test/portal')).toBeNull()
    expect(extractPresentationToken('https://experimente.test/?token=nope')).toBeNull()
    expect(extractPresentationToken(`https://experimente.test/?token=${'a'.repeat(80)}`)).toBeNull()
  })

  it('refuses arbitrary scanned content instead of guessing', () => {
    for (const junk of ['', '   ', 'hello world', '{"token":"x"}', 'WIFI:S:net;;']) {
      expect(extractPresentationToken(junk)).toBeNull()
    }
  })
})
