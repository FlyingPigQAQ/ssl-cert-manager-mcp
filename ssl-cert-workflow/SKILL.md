---
name: ssl-cert-workflow
description: Automate SSL certificate lifecycle from application to deployment and notification. Trigger when the user wants to apply for an HTTPS certificate, renew a Let's Encrypt certificate, verify a domain via DNS, deploy certificates to remote servers, execute post-deployment commands, or send certificate results by email. Also trigger for requests involving ACME, SSL automation, certificate management, or server TLS setup.
---

# SSL Certificate Automation Workflow

Guide users through the complete SSL certificate lifecycle using the `ssl-cert-manager-mcp` MCP server tools.

## Workflow Overview

1. Capture intent and gather inputs
2. Validate prerequisites and credentials
3. Execute: Apply → DNS Verify → Deploy → Execute Commands → Notify
4. Report results and next steps

## Step 1: Capture Intent

Ask the user for:

- **Domain(s)**: Which domains need certificates (supports wildcard `*.example.com`)?
- **Target server(s)**: Hostname or IP, SSH port, remote user, deployment directory
- **Post-deploy commands** (optional): Shell commands to run after deployment (e.g., `nginx -s reload`)
- **Notification email(s)** (optional): Where to send the result. Skip if SMTP is not configured.
- **Staging or production**: Recommend staging first for new setups

## Step 2: Validate Prerequisites

Confirm the following environment variables or tool parameters are available:

- `ALI_ACCESS_KEY_ID` and `ALI_ACCESS_KEY_SECRET` for Aliyun DNS
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` for email notification (optional)
- SSH private key path or password for remote server access

If any are missing, prompt the user to provide them or guide them to `references/setup-guide.md`.

## Step 3: Execute Orchestration

Use the MCP tools in this order:

### 3.1 Apply for Certificate

Call `apply_certificate` with:
- `domain`: the domain name
- `email`: contact email for ACME account
- `staging`: `true` for first-time testing
- `saveToDir` (optional): local directory to save certificate files (e.g., `/tmp/certs` or `./certs`). The tool will write `domain_cert.pem`, `domain_key.pem`, and `domain_chain.pem`.

Capture the returned certificate paths (`certPath`, `keyPath`, `chainPath`), expiration date, and PEM contents. If `saveToDir` is provided, use those local file paths in the next `deploy_certificate` step.

### 3.2 DNS Verification

The `apply_certificate` tool will handle DNS-01 challenge creation internally using `verify_dns`. Wait for propagation (usually 10-60 seconds). After the certificate is issued, the tool should clean up the TXT record automatically.

If manual control is needed, use:
- `verify_dns` with `action: add` to create the TXT record
- `verify_dns` with `action: remove` to clean up after verification

### 3.3 Deploy Certificate

Call `deploy_certificate` with:
- `host`: target server host
- `cert`: certificate PEM content or local file path
- `key`: private key PEM content or local file path
- `remoteDir`: destination directory on the remote server (e.g., `/etc/nginx/ssl`). The directory will be auto-created if it does not exist.
- `certFilename` / `keyFilename` (optional): filenames within `remoteDir` (defaults: `cert.pem` / `key.pem`)
- `certRemotePath` / `keyRemotePath` (optional): full remote file paths (e.g., `/etc/nginx/ssl/example.com.crt`). These override `remoteDir` + filename.

If you obtained certificate file paths from `apply_certificate` (via `saveToDir`), pass those paths as `cert` and `key` — the tool accepts both PEM strings and file paths.

### 3.4 Execute Post-Deploy Commands

Call `execute_remote_command` with:
- `host`: same target server
- `command`: the shell command to run (e.g., `systemctl reload nginx`)
- `timeout`: optional, in milliseconds

Capture `stdout`, `stderr`, and `exitCode`.

### 3.5 Send Notification Email (Optional)

Call `send_email` with:
- `to`: recipient email(s)
- `subject`: e.g., `SSL Certificate Deployed: example.com`
- `body`: summary including domain, expiry date, deployment path, command output, and any errors
- `attachments`: optional, attach the certificate files if needed

If SMTP is not configured (`SMTP_HOST` is empty), this step will be skipped gracefully without error. Proceed to the results report.

## Step 4: Report Results

Present a concise summary:

- Certificate domain and validity period
- Deployment target and remote paths
- Post-deploy command exit code and output preview
- Email delivery status (or a note that it was skipped if SMTP is not configured)
- Any warnings or errors encountered

## Error Handling

If any step fails:
1. Do not proceed to subsequent steps
2. Report the failure with the tool's error message
3. Suggest remediation (e.g., check DNS propagation, verify SSH credentials)
4. Offer to retry from the failed step

## Safety Guidelines

- Always recommend staging (`staging: true`) for first-time setups
- Never log or expose `ALI_ACCESS_KEY_SECRET`, `SMTP_PASS`, or SSH private key contents
- Confirm destructive actions (overwriting existing certificates) with the user
- Include a `--dry-run` option if the user wants to simulate without applying changes
