import client from './client';

export const reedApi = {
  listActive: () => client.get('/api/reeds').then(r => r.data),
  listAll: () => client.get('/api/reeds/all').then(r => r.data),
  create: (data) => client.post('/api/reeds', data).then(r => r.data),
  update: (id, data) => client.patch(`/api/reeds/${id}`, data).then(r => r.data),
  retire: (id) => client.delete(`/api/reeds/${id}`).then(r => r.data),
};
