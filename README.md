# 🧠 TG Smart Scheduler

一个基于 GitHub Actions 的智能定时任务系统。

## 🚀 功能特性

- 首次运行后 3 天（可自己修改）执行第一次任务；
- 之后每 60 天（可自己修改）自动执行一次；
- 每次运行后自动更新下次执行时间（修改自身 cron）；
- 无需人工干预或每日运行。

## ⚙️ 使用步骤

1. 创建一个新仓库并上传本项目文件；
2. 在仓库 Settings → Secrets → Actions 中添加：

   | 名称 | 说明 |
   |------|------|
   | `TG_BOT_TOKEN` | Telegram 机器人 Token |
   | `TG_CHAT_ID` | 聊天 ID |
   | `GITHUB_TOKEN` | 自动写入权限（系统内置即可） |

3. 手动运行一次工作流：Actions → Smart Telegram Scheduler → Run workflow；
4. 首次运行成功后，会自动更新为 3 天（可自己修改）后执行。

