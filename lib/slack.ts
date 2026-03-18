const BASE = 'https://slack.com/api'

function headers() {
  return {
    Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  }
}

export async function slackGet(method: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}/${method}${qs ? '?' + qs : ''}`, {
    headers: headers(),
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Slack ${method} ${res.status}`)
  return res.json()
}

export async function postMessage(channel: string, text: string) {
  const res = await fetch(`${BASE}/chat.postMessage`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ channel, text }),
  })
  if (!res.ok) throw new Error(`Slack postMessage ${res.status}`)
  return res.json()
}

export async function authTest() {
  return slackGet('auth.test')
}

export async function channelHistory(channel: string, oldest: string, limit = '100') {
  return slackGet('conversations.history', { channel, oldest, limit })
}

export async function userInfo(user: string) {
  return slackGet('users.info', { user })
}

export async function usersList() {
  return slackGet('users.list')
}

export async function conversationsList() {
  // channels:read scope — public channels only
  return slackGet('conversations.list', {
    types: 'public_channel',
    limit: '200',
  })
}
