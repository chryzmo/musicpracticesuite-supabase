import client from './client'

export const practiceApi = {
  list: (params) => client.get('/api/practice', { params }).then(r => r.data),
  summary: () => client.get('/api/practice/summary').then(r => r.data),
  insights: () => client.get('/api/practice/insights').then(r => r.data),
  pieces: () => client.get('/api/practice/pieces').then(r => r.data),
  create: (data) => client.post('/api/practice', data).then(r => r.data),
  remove: (id) => client.delete(`/api/practice/${id}`).then(r => r.data),
}
