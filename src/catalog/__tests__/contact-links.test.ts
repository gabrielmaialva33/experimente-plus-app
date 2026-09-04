import { brazilianWhatsApp, dialable } from '../contact-links'

describe('brazilianWhatsApp', () => {
  it('prefixes 55 only for a national-length number', () => {
    expect(brazilianWhatsApp('(43) 99999-1234')).toBe('5543999991234')
    expect(brazilianWhatsApp('4333334444')).toBe('554333334444')
  })

  it('does not double the country code when it is already there', () => {
    // The partner types the number as it appears on their own material.
    expect(brazilianWhatsApp('+55 43 99999-1234')).toBe('5543999991234')
    expect(brazilianWhatsApp('554333334444')).toBe('554333334444')
  })

  it('refuses a number it cannot build a valid link from', () => {
    expect(brazilianWhatsApp(null)).toBeNull()
    expect(brazilianWhatsApp('123')).toBeNull()
    expect(brazilianWhatsApp('12345678901234')).toBeNull()
    expect(brazilianWhatsApp('1143999991234')).toBeNull()
  })
})

describe('dialable', () => {
  it('keeps a leading + so an international number still dials', () => {
    expect(dialable('+55 (43) 3333-4444')).toBe('+554333334444')
    expect(dialable('(43) 3333-4444')).toBe('4333334444')
  })

  it('refuses something too short to be a number', () => {
    expect(dialable(null)).toBeNull()
    expect(dialable('123')).toBeNull()
  })
})
