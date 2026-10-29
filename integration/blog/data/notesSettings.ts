// Keep public discovery off in production until the online Notes rollout is verified.
// Direct Notes URLs and the authenticated draft view remain available independently.
export const productionNotesDiscoveryEnabled = false
export const notesDiscoveryEnabled =
  process.env.NODE_ENV !== 'production' || productionNotesDiscoveryEnabled
