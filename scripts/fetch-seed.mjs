const repos = [
  '521xueweihan/HelloGitHub',
  'vinta/awesome-python',
  'penpot/penpot',
  'sindresorhus/awesome',
  'ollama/ollama',
  'langchain-ai/langchain',
  'microsoft/vscode',
  'yt-dlp/yt-dlp',
  'astral-sh/ruff',
  'GraphiteEditor/Graphite',
  'openclaw/openclaw',
  'junegunn/fzf',
];
const out = [];
for (const r of repos) {
  try {
    const res = await fetch(`https://api.github.com/repos/${r}`, {
      headers: { 'User-Agent': 'github-favorites-seed', Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) { console.error('FAIL', r, res.status); continue; }
    const j = await res.json();
    out.push({
      fullName: j.full_name,
      owner: j.owner.login,
      name: j.name,
      avatar: j.owner.avatar_url,
      description: j.description,
      stargazers: j.stargazers_count,
      forks: j.forks_count,
      language: j.language,
      topics: (j.topics || []).slice(0, 5),
      homepage: j.homepage || null,
      pushedAt: j.pushed_at,
      htmlUrl: j.html_url,
    });
    console.log('OK', r);
  } catch (e) {
    console.error('ERR', r, e.message);
  }
}
console.log('---JSON---');
console.log(JSON.stringify(out, null, 2));
