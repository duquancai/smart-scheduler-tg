const fetch = require("node-fetch");
const fs = require("fs");

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID;
const GITHUB_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.GH_REPOSITORY;
const FILE_PATH = ".github/workflows/scheduler.yml";

// 配置常量
const SCHEDULE_CONFIG = {
  FIRST_RUN: 130,    // 首次运行后130天
  NORMAL_RUN: 337,   // 正常运行时337天
  TIMEZONE: "UTC"
};

class SchedulerUpdater {
  constructor() {
    this.validateEnv();
  }

  validateEnv() {
    const required = ["TG_BOT_TOKEN", "TG_CHAT_ID", "GH_TOKEN", "GH_REPOSITORY"];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error(`❌ 缺少环境变量：${missing.join(", ")}`);
      process.exit(1);
    }
  }

  async sendTelegramMessage() {
    const message = `📅 请续订你的域名us.kg及xx.kg，到期时间不足1月！\n` +
                   `🔗 <a href="https://dash.domain.digitalplat.org">请点击进入手动续订</a>\n\n` +
                   `⏰ 提醒时间: ${new Date().toLocaleString('zh-CN')}`;

    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: false
        }),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }

      console.log("✅ Telegram消息发送成功");
      return true;
    } catch (error) {
      console.error("❌ Telegram消息发送失败:", error.message);
      return false;
    }
  }

  calculateNextRun(isFirstRun) {
    const now = new Date();
    const daysToAdd = isFirstRun ? SCHEDULE_CONFIG.FIRST_RUN : SCHEDULE_CONFIG.NORMAL_RUN;
    const nextRun = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    
    // 转换为cron格式 (UTC时间)
    const minute = 0;
    const hour = 0;
    const day = nextRun.getUTCDate();
    const month = nextRun.getUTCMonth() + 1;
    
    return {
      cron: `${minute} ${hour} ${day} ${month} *`,
      date: nextRun,
      daysFromNow: daysToAdd
    };
  }

  async getCurrentWorkflow() {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: Buffer.from(data.content, "base64").toString("utf-8"),
        sha: data.sha
      };
    } catch (error) {
      console.error("❌ 获取workflow文件失败:", error.message);
      throw error;
    }
  }

  updateWorkflowContent(content, newCron) {
    return content
      .replace(/cron: ["']([^"']+)["']/, `cron: "${newCron}"`)
      .replace(/# FIRST_RUN/, "")
      .trim() + "\n";
  }

  async updateWorkflowFile(newContent, sha) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
          },
          body: JSON.stringify({
            message: `🔁 更新调度时间: ${new Date().toISOString().split('T')[0]}`,
            content: Buffer.from(newContent).toString("base64"),
            sha: sha,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
      }

      console.log("✅ workflow文件更新成功");
      return true;
    } catch (error) {
      console.error("❌ workflow文件更新失败:", error.message);
      throw error;
    }
  }

  async run() {
    try {
      console.log("🚀 开始执行调度更新...");

      // 1. 发送Telegram提醒
      await this.sendTelegramMessage();

      // 2. 获取当前workflow配置
      const { content, sha } = await this.getCurrentWorkflow();
      const isFirstRun = content.includes("# FIRST_RUN");

      // 3. 计算下次执行时间
      const schedule = this.calculateNextRun(isFirstRun);
      
      console.log(`📅 当前运行类型: ${isFirstRun ? "首次" : "常规"}`);
      console.log(`🕓 下次执行时间: ${schedule.date.toISOString()}`);
      console.log(`⏰ Cron表达式: ${schedule.cron}`);
      console.log(`📆 距离现在: ${schedule.daysFromNow}天`);

      // 4. 更新workflow内容
      const newContent = this.updateWorkflowContent(content, schedule.cron);

      // 5. 提交更新
      await this.updateWorkflowFile(newContent, sha);

      console.log("🎉 调度更新完成！");

    } catch (error) {
      console.error("💥 调度更新失败:", error.message);
      process.exit(1);
    }
  }
}

// 执行主程序
(async () => {
  const updater = new SchedulerUpdater();
  await updater.run();
})();