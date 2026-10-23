import { supabase } from '../lib/supabase'
import { toSnake, unwrap } from './mapping'

// Row-level security limits every query to the signed-in user's reeds
const reeds = () => supabase.from('reeds')

export const reedApi = {
  listActive: async () =>
    unwrap(await reeds().select().eq('is_active', true).order('open_date', { ascending: false })),

  listAll: async () =>
    unwrap(await reeds().select().order('open_date', { ascending: false })),

  create: async ({ identifier, reedType, openDate, notes }) =>
    unwrap(await reeds()
      .insert(toSnake({ identifier, reedType, openDate: openDate || undefined, notes: notes || null }))
      .select()
      .single()),

  update: async (id, { notes, retireDate, usageMinutes }) =>
    unwrap(await reeds()
      .update(toSnake({
        notes,
        retireDate: retireDate === undefined ? undefined : retireDate || null,
        usageMinutes: usageMinutes === undefined ? undefined : Number(usageMinutes),
      }))
      .eq('id', id)
      .select()
      .single()),

  retire: async (id) =>
    unwrap(await reeds()
      .update({ is_active: false, retire_date: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()),
}
