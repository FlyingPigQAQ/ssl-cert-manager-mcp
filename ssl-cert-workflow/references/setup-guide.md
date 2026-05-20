# SSL Certificate Automation Setup Guide

## 1. Aliyun DNS API Credentials

1. Log in to the [Alibaba Cloud Console](https://www.alibabacloud.com/)
2. Go to **RAM** → **Users** → Create a new user (e.g., `cert-manager`)
3. Attach the policy `AliyunDNSFullAccess` (or create a custom policy limited to your domain)
4. Create an AccessKey and save the `AccessKey ID` and `AccessKey Secret`
5. Set environment variables:
   ```bash
   export ALI_ACCESS_KEY_ID=your-key-id
   export ALI_ACCESS_KEY_SECRET=your-key-secret
   ```

## 2. SMTP Configuration

Use any SMTP-compatible provider (e.g., Gmail, SendGrid, AWS SES, Aliyun Mail):

| Provider | Host | Port | Secure |
|----------|------|------|--------|
| Gmail | smtp.gmail.com | 587 | false |
| SendGrid | smtp.sendgrid.net | 587 | false |
| Aliyun Mail | smtp.dm.aliyun.com | 465 | true |

For Gmail, generate an **App Password** instead of using your login password.

## 3. SSH Key Authentication

Generate a key pair if you don't have one:
```bash
ssh-keygen -t ed25519 -C "cert-manager" -f ~/.ssh/cert_manager_key
ssh-copy-id -i ~/.ssh/cert_manager_key.pub root@your-server
```

Set the environment variable:
```bash
export SSH_PRIVATE_KEY_PATH=/Users/yourname/.ssh/cert_manager_key
```

## 4. MCP Server Installation

```bash
cd ssl-cert-manager-mcp
npm install
npm run build
```

Configure `.env` based on `.env.example`, then start:
```bash
npm start
```

Or connect via stdio in Claude Code settings.

## 5. Testing with Staging

Always test with Let's Encrypt staging first:
```
ACME_DIRECTORY_URL=https://acme-staging-v02.api.letsencrypt.org/directory
```

Staging certificates are not trusted by browsers but allow you to verify the full workflow without rate limits.
