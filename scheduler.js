const fetch = require("node-fetch");
const fs = require("fs");

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID;
const GITHUB_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.GH_REPOSITORY;
const FILE_PATH = ".github/workflows/scheduler.yml";

if (!BOT_TOKEN || !CHAT_ID || !GITHUB_TOKEN) {
  console.error("❌ 缺少环境变量：TG_BOT_TOKEN / TG_CHAT_ID / GH_TOKEN");
  process.exit(1);
}

(async () => {
  // 发送 Telegram 消息
  const now = new Date();
  const msg = `📅 请续订你的域名us.kg及xx.kg，到期时间不足1月！\n 🔗 <a href=https://dash.domain.digitalplat.org>查看分支</a>\n\n`;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: msg }),
  });

  // 获取当前 scheduler.yml
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
  });
  const data = await res.json();
  if (!data.content) {
    console.error("❌ 无法获取 scheduler.yml 文件内容");
    process.exit(1);
  }

  // 计算下次执行时间
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  const isFirst = content.includes("# FIRST_RUN");
  const next = new Date(now.getTime() + (isFirst ? 130 : 337) * 24 * 60 * 60 * 1000);

  // 转换为 cron 格式（UTC）
  const minute = 0;
  const hour = 0;
  const day = next.getUTCDate();
  const month = next.getUTCMonth() + 1;
  const cron = `${minute} ${hour} ${day} ${month} *`;

  const newContent = content
    .replace(/cron: ".*"/, `cron: "${cron}"`)
    .replace("# FIRST_RUN", ""); // 去掉首次标记

  console.log(`🕓 下次执行时间（UTC）：${next.toISOString()}`);
  console.log(`🔁 更新 cron 表达式：${cron}`);

  // 更新 scheduler.yml 文件
  await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
    body: JSON.stringify({
      message: `Update next schedule to ${cron}`,
      content: Buffer.from(newContent).toString("base64"),
      sha: data.sha,
    }),
  });

  console.log("✅ 已更新 scheduler.yml 文件，下次执行时间已设定。");
})();
