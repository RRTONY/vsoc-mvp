import { getSupabase } from './supabase'

export interface TeamMemberRow {
  id: string
  full_name: string
  vcos_username: string | null
  slack_aliases: string[]
  clickup_key: string | null
  braintrust_name: string | null
  webwork_username: string | null
  role_description: string | null
  hourly_rate: number
  bills_hours: boolean
  files_report: boolean
  active: boolean
}

// In-process cache — avoids a DB round-trip on every request, flushes every 5 min
let _cache: TeamMemberRow[] | null = null
let _cacheTime = 0
const TTL_MS = 5 * 60 * 1000

export async function getTeamMembers(activeOnly = true): Promise<TeamMemberRow[]> {
  if (_cache && Date.now() - _cacheTime < TTL_MS) {
    return activeOnly ? _cache.filter(m => m.active) : _cache
  }
  const sb = getSupabase()
  const { data } = await sb
    .from('team_members')
    .select('*')
    .order('full_name')
  _cache = (data ?? []) as TeamMemberRow[]
  _cacheTime = Date.now()
  return activeOnly ? _cache.filter(m => m.active) : _cache
}

export function invalidateTeamCache() {
  _cache = null
  _cacheTime = 0
}
