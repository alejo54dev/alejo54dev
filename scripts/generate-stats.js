const USER = process.env.USER || "alejo54dev"
const TOKEN = process.env.GITHUB_TOKEN || ""
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "profile-stats-generator",
}
if (TOKEN) headers.Authorization = `token ${TOKEN}`

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers })
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${res.statusText}`)
  return res
}

const FONT = "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function fmt(n) {
  return n.toLocaleString("en-US")
}

function buildStats(data) {
  const metrics = [
    { label: "Commits", value: data.commits },
    { label: "Repos", value: data.repos },
    { label: "Stars", value: data.stars },
    { label: "Followers", value: data.followers },
  ]
  let cols = ""
  metrics.forEach((m, i) => {
    const x = 24 + i * 168
    cols += `<text x="${x}" y="128" font-family="${FONT}" font-size="34" font-weight="700" fill="#E6EDF3">${fmt(m.value)}</text>`
    cols += `<text x="${x}" y="150" font-family="${FONT}" font-size="12" fill="#8B949E">${esc(m.label)}</text>`
    if (i > 0) cols += `<line x1="${x - 16}" y1="86" x2="${x - 16}" y2="152" stroke="#21262d"/>`
  })
  return `<svg width="700" height="210" viewBox="0 0 700 210" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="698" height="208" rx="10" fill="#0d1117" stroke="#30363D"/>
  <text x="24" y="36" font-family="${FONT}" font-size="13" fill="#8B949E">GitHub Stats</text>
  <line x1="24" y1="52" x2="676" y2="52" stroke="#21262d"/>
  ${cols}
  <text x="24" y="194" font-family="${FONT}" font-size="11" fill="#484f58">alejo54dev · generado automáticamente desde GitHub</text>
</svg>`
}

async function main() {
  const user = await (await api(`/users/${USER}`)).json()
  const repos = await (await api(`/users/${USER}/repos?per_page=100&sort=updated`)).json()

  let commits = 0
  let stars = 0

  await Promise.all(
    repos.map(async (repo) => {
      stars += repo.stargazers_count
      try {
        const cs = await api(`/repos/${USER}/${repo.name}/commits?per_page=1`)
        const link = cs.headers.get("link") || ""
        const m = link.match(/[?&]page=(\d+)>;\s*rel="last"/)
        commits += m ? parseInt(m[1], 10) : 0
      } catch (e) {
        console.error(`commits ${repo.name}: ${e.message}`)
      }
    }),
  )

  const fs = await import("node:fs")
  fs.writeFileSync("assets/stats.svg", buildStats({ commits, repos: repos.length, stars, followers: user.followers }))
  console.log(`OK commits=${commits} repos=${repos.length} stars=${stars} followers=${user.followers}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
