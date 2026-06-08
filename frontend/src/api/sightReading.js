import client from './client'

export const sightReadingApi = {
  generate: (data) => client.post('/api/sight-reading/generate', data).then(r => r.data),
  logSession: (data) => client.post('/api/sight-reading/session', data).then(r => r.data),
}
