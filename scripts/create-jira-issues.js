const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY } = process.env;
const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

async function createIssue(issue) {
  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        project:     { key: JIRA_PROJECT_KEY },
        summary:     issue.title,
        description: {
          type: "doc", version: 1,
          content: [{ type: "paragraph",
            content: [{ type: "text", text: issue.body }] }]
        },
        issuetype: { name: "Story" },
        priority:  { name: issue.priority || "Medium" },
        labels:    issue.labels || [],
      }
    }),
  });
  const data = await res.json();
  if (res.ok) console.log(`✅ 作成: ${data.key} - ${issue.title}`);
  else        console.error(`❌ 失敗: ${issue.title}`, data);
}

async function main() {
  const file = process.argv[2];
  if (!file) { console.error('使い方: node scripts/create-jira-issues.js issues.json'); process.exit(1); }
  const issues = JSON.parse(fs.readFileSync(file, 'utf-8'));
  for (const issue of issues) {
    await createIssue(issue);
    await new Promise(r => setTimeout(r, 300));
  }
}
main();
