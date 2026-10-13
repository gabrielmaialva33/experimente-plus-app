import { distanceKm, distanceLabel, placeDistance } from '@/catalog/distance'

/** A point in the centre of Londrina. */
const HERE = { latitude: -23.3105, longitude: -51.1628 }

describe('distanceKm', () => {
  it('measures over the Earth, a hundredth of a degree of latitude being about 1,1 km', () => {
    expect(distanceKm(HERE, HERE)).toBe(0)
    expect(distanceKm(HERE, { latitude: -23.3005, longitude: -51.1628 })).toBeCloseTo(1.112, 3)
    // About twelve kilometres west, towards Cambé.
    expect(distanceKm(HERE, { latitude: -23.2766, longitude: -51.2778 })).toBeCloseTo(12.34, 2)
  })

  it('is the same both ways', () => {
    const there = { latitude: -23.4205, longitude: -51.9331 }
    expect(distanceKm(HERE, there)).toBeCloseTo(distanceKm(there, HERE), 9)
  })
})

describe('distanceLabel', () => {
  it('reads metres in steps of 50 under a kilometre', () => {
    expect(distanceLabel(0)).toBe('a menos de 100 m')
    expect(distanceLabel(0.051)).toBe('a menos de 100 m')
    expect(distanceLabel(0.1)).toBe('a 100 m')
    expect(distanceLabel(0.3447)).toBe('a 350 m')
    expect(distanceLabel(0.974)).toBe('a 950 m')
  })

  it('reads kilometres to one decimal with a comma, and whole ones without', () => {
    // 980 m rounds to a kilometre, not to "1000 m".
    expect(distanceLabel(0.98)).toBe('a 1 km')
    expect(distanceLabel(1.2009)).toBe('a 1,2 km')
    expect(distanceLabel(12.3352)).toBe('a 12,3 km')
    expect(distanceLabel(3)).toBe('a 3 km')
  })

  it('says nothing without a distance', () => {
    expect(distanceLabel(null)).toBeNull()
    expect(distanceLabel(Number.NaN)).toBeNull()
    expect(distanceLabel(-1)).toBeNull()
  })
})

describe('placeDistance', () => {
  it('says how far a place is from the position of the search', () => {
    expect(placeDistance(HERE, { latitude: -23.3074, longitude: -51.1628 })).toBe('a 350 m')
    expect(placeDistance(HERE, { latitude: -23.2997, longitude: -51.1628 })).toBe('a 1,2 km')
  })

  it('says nothing without a position or without the place on the map', () => {
    expect(placeDistance(null, { latitude: -23.3074, longitude: -51.1628 })).toBeNull()
    expect(placeDistance(HERE, { latitude: null, longitude: null })).toBeNull()
    expect(placeDistance(HERE, { latitude: -23.3074 })).toBeNull()
  })
})
