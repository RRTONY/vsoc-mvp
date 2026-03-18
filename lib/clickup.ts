const BASE = 'https://api.clickup.com/api/v2'

function headers() {
  return {
    Authorization: process.env.CLICKUP_API_KEY ?? '',
    'Content-Type': 'application/json',
  }
}

export async function getTeamTasks(teamId: string) {
  const res = await fetch(
    `${BASE}/team/${teamId}/task?subtasks=true&include_closed=false`,
    { headers: headers(), next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`ClickUp tasks ${res.status}`)
  return res.json()
}

export async function pingUser() {
  const res = await fetch(`${BASE}/user`, {
    headers: headers(),
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`ClickUp ping ${res.status}`)
  return res.json()
}

export async function createTask(listId: string, data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/list/${listId}/task`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`ClickUp createTask ${res.status}`)
  return res.json()
}
