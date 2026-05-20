# SSL Cert Manager MCP

用自然语言对话完成 SSL 证书的全生命周期管理：申请、DNS 验证、部署到服务器、执行重启命令、邮件通知——全程不用记命令行。

专为 [Claude Code](https://claude.ai/code) 设计的 MCP Server + Skill 组合。

---

## 特性

- **对话式操作** — 对 Claude 说"帮我申请 example.com 的证书"即可启动完整流程
- **ACME 自动化** — 内置 Let's Encrypt 支持，自动处理 DNS-01 挑战
- **多 DNS 提供商** — 阿里云 DNS（更多提供商持续增加）
- **一键部署** — 证书通过 SSH/SFTP 自动推送到远程服务器
- **命令编排** — 部署后自动执行命令（如 `nginx -s reload`）
- **邮件通知** — 可选：把证书结果发送到邮箱
- **防误操作** — 首次推荐 staging 环境，避免触发 rate limit

---

## 架构

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Claude Code  │────▶│  ssl-cert-workflow │────▶│ ssl-cert-manager │
│   (对话界面)   │     │    (Skill 指引)     │     │   (MCP Server)   │
└──────────────┘     └──────────────────┘     └──────────────────┘
                                                          │
                           ┌──────────────┬───────────────┼──────────────┐
                           ▼              ▼               ▼              ▼
                      Let's Encrypt    Aliyun DNS      SSH/SFTP      SMTP
```

- **MCP Server** (`ssl-cert-manager-mcp/`) — 提供工具调用能力
- **Skill** (`ssl-cert-workflow/`) — 定义对话式工作流逻辑

---

## 快速开始

### 前提条件

- Node.js 18+
- Claude Code (CLI / Desktop / IDE 扩展)
- 阿里云 DNS 解析的域名（支持通配符 `*.example.com`）
- 目标服务器的 SSH 访问权限

### 方式一：一键安装（推荐）

```bash
curl -fsSL https://raw.githubusercontent.com/FlyingPigQAQ/ssl-cert-manager-mcp/main/install.sh | bash
```

脚本会自动：
- 检查 Node.js 环境
- 安装 MCP Server（本地 / npm / GitHub 自动探测）
- 安装 Claude Code Skill
- 初始化 `.env` 配置文件

### 方式二：手动安装

```bash
# 克隆仓库
git clone https://github.com/FlyingPigQAQ/ssl-cert-manager-mcp.git
cd ssl-cert-manager-mcp

# 安装依赖
npm install

# 构建
npm run build

# 安装 Skill
mkdir -p ~/.claude/skills/ssl-cert-workflow
cp ssl-cert-workflow/SKILL.md ~/.claude/skills/ssl-cert-workflow/

# 运行安装脚本
./install.sh
```

### 2. 配置环境变量

复制示例配置并填写你的凭证：

```bash
cp .env.example .env
```

编辑 `.env`：

```ini
# 阿里云 DNS API（必须）
# https://ram.console.aliyun.com/manage/ak
ALI_ACCESS_KEY_ID=your-access-key-id
ALI_ACCESS_KEY_SECRET=your-access-key-secret
ALI_REGION_ID=cn-hangzhou

# SSH 默认配置（可选，可被单条调用覆盖）
SSH_PRIVATE_KEY_PATH=/Users/yourname/.ssh/id_rsa
SSH_USER=root
SSH_PORT=22

# SMTP 邮件通知（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# ACME 目录（可选）
ACME_DIRECTORY_URL=https://acme-v02.api.letsencrypt.org/directory
# 测试环境：
# ACME_DIRECTORY_URL=https://acme-staging-v02.api.letsencrypt.org/directory
```

> **安全提示**：`.env` 文件已加入 `.gitignore`，切勿提交到版本控制。

### 3. 安装 Skill

```bash
mkdir -p ~/.claude/skills/ssl-cert-workflow
cp /path/to/ssl-cert-workflow/SKILL.md ~/.claude/skills/ssl-cert-workflow/
```

或一键脚本：

```bash
curl -fsSL https://raw.githubusercontent.com/FlyingPigQAQ/ssl-cert-manager-mcp/main/install-skill.sh | bash
```

### 4. 在 Claude Code 中启用 MCP Server

#### 方式 A：项目级配置（推荐）

在项目根目录创建 `.claude/settings.local.json`：

```json
{
  "env": {
    "ALI_ACCESS_KEY_ID": "your-access-key-id",
    "ALI_ACCESS_KEY_SECRET": "your-access-key-secret",
    "ALI_REGION_ID": "cn-hangzhou",
    "SSH_PRIVATE_KEY_PATH": "/Users/yourname/.ssh/id_rsa",
    "SSH_USER": "root",
    "SSH_PORT": "22"
  },
  "enabledMcpjsonServers": ["ssl-cert-manager"]
}
```

并在同级目录的 `mcp.json` 中注册 server：

```json
{
  "mcpServers": {
    "ssl-cert-manager": {
      "command": "node",
      "args": ["/absolute/path/to/ssl-cert-manager-mcp/dist/index.js"]
    }
  }
}
```

#### 方式 B：Claude Desktop 全局配置

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）或对应平台的配置路径：

```json
{
  "mcpServers": {
    "ssl-cert-manager": {
      "command": "node",
      "args": ["/absolute/path/to/ssl-cert-manager-mcp/dist/index.js"],
      "env": {
        "ALI_ACCESS_KEY_ID": "your-access-key-id",
        "ALI_ACCESS_KEY_SECRET": "your-access-key-secret"
      }
    }
  }
}
```

重启 Claude Code 后生效。

---

## 使用方法

启动 Claude Code，直接说出你的需求：

```
帮我申请 example.com 的证书，部署到 1.2.3.4 的 /etc/nginx/ssl 目录
```

Claude 会自动引导你完成：

1. **确认域名** — 支持单域名或通配符
2. **选择环境** — 首次推荐 staging 测试
3. **提供邮箱** — ACME 账户注册用
4. **验证 DNS** — 自动添加 TXT 记录，等待传播
5. **部署证书** — 通过 SSH 上传到指定目录
6. **执行命令** — 如 `nginx -t && nginx -s reload`
7. **发送通知** — 邮件推送结果（如配置了 SMTP）

### 常用话术

| 需求 | 说法 |
|---|---|
| 申请证书 | "帮我申请 ssl.example.com 的证书" |
| 通配符证书 | "申请 *.example.com 的通配符证书" |
| 仅 staging 测试 | "先用 staging 测试申请 example.com" |
| 部署 + 重启 | "部署证书到 1.2.3.4 并 reload nginx" |
| 续期 | "帮我续期 example.com 的证书" |

---

## 提供的工具

| 工具名 | 功能 | 必需参数 |
|---|---|---|
| `apply_certificate` | 通过 ACME 申请证书 | `domain`, `email` |
| `verify_dns` | 添加/删除 DNS TXT 记录 | `domain`, `rr`, `value`, `action` |
| `deploy_certificate` | 上传证书到远程服务器 | `host`, `cert`, `key` |
| `execute_remote_command` | 在远程服务器执行命令 | `host`, `command` |
| `send_email` | 发送通知邮件 | `to`, `subject`, `body` |

---

## 工作流详解

```
用户发起请求
    │
    ▼
┌─────────────────┐
│ 1. 收集信息      │  域名、服务器、部署路径、邮箱、是否 staging
│ 2. 验证环境      │  检查 API 密钥、SSH 连通性
│ 3. 申请证书      │  ACME 创建订单 → DNS-01 挑战 → 颁发证书
│ 4. 部署证书      │  SCP 上传 cert + key 到远程目录
│ 5. 执行命令      │  如服务重载、配置检查
│ 6. 发送通知      │  邮件报告结果（可选）
│ 7. 汇总报告      │  有效期、路径、命令输出、状态
└─────────────────┘
```

如果任何一步失败，流程会中断并报告错误，不会继续执行后续步骤。

---

## 安全指南

- **密钥保护**：`ALI_ACCESS_KEY_SECRET`、`SMTP_PASS`、SSH 私钥内容永远不会在对话中展示或记录
- **Staging 优先**：首次配置强烈建议先用 `staging: true` 跑通流程，避免生产环境 rate limit
- **覆盖确认**：部署到已有证书的路径时，Claude 会询问是否覆盖
- **最小权限**：阿里云 AccessKey 建议只授予 `AliyunDNSFullAccess` 权限

---

## 常见问题

**Q: 不支持我的 DNS 提供商怎么办？**

A: 目前仅支持阿里云 DNS。你可以手动完成 DNS 验证步骤，或提交 PR 增加 Cloudflare、AWS Route53 等支持。

**Q: SSH 连接失败怎么办？**

A: 检查：
- 服务器 22 端口可访问
- 私钥路径正确且权限为 `600`
- 目标服务器已添加公钥到 `~/.ssh/authorized_keys`
- 如使用密码而非密钥，在调用时传入 `password` 参数

**Q: 证书有效期多久？**

A: Let's Encrypt 证书有效期 90 天。建议设置 cron 定期续期，或手动运行续期命令。

**Q: 可以管理多个域名的证书吗？**

A: 可以。对每个域名分别发起请求即可，支持批量操作。

---

## 开发

```bash
# 本地开发
npm run dev

# 调试 MCP Server
npm run inspector

# 构建
npm run build
```

---

## 许可证

MIT
