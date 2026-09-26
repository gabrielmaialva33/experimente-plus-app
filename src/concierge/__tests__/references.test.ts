import { placeHref } from '@/place/links'
import { referenceHighlight } from '@/concierge/references'

it('brings an event or an experience into view and opens a place at the top', () => {
  expect(referenceHighlight('event:7')).toEqual({ kind: 'event', id: 7 })
  expect(referenceHighlight('experience:12')).toEqual({ kind: 'experience', id: 12 })
  expect(referenceHighlight('establishment:3')).toBeNull()
  expect(referenceHighlight('event:')).toBeNull()
  expect(referenceHighlight('')).toBeNull()

  expect(placeHref('londrina', 'atelie', referenceHighlight('event:7'))).toBe(
    '/estabelecimento/londrina/atelie?destaque=event-7'
  )
  expect(placeHref('londrina', 'atelie', referenceHighlight('establishment:3'))).toBe(
    '/estabelecimento/londrina/atelie'
  )
})
