// The online Notes rollout is verified; include Notes in public navigation and listings.
// Direct Notes URLs and the authenticated draft view remain available independently.
export const productionNotesDiscoveryEnabled = true
export const notesDiscoveryEnabled =
  process.env.NODE_ENV !== 'production' || productionNotesDiscoveryEnabled
