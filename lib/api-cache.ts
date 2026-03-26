import { supabase } from './supabase'

export async function getCached(source: string) {
  const { data } = await supabase
    .from('vcos_api_cache')
    .select('data, fetched_at')
    .eq('source', source)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}

export async function setCache(source: string, payload: unknown) {
  await supabase.from('vcos_api_cache').insert({ source, data: payload })
}
