#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://raw.githubusercontent.com/FlyingPigQAQ/ssl-cert-manager-mcp/main/ssl-cert-workflow/SKILL.md"
SKILL_DIR="${HOME}/.claude/skills/ssl-cert-workflow"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$SKILL_DIR"

echo "Downloading ssl-cert-workflow skill..."
curl -fsSL "$REPO_URL" -o "${SKILL_DIR}/SKILL.md"

echo -e "${GREEN}✅ Skill installed to ${SKILL_DIR}${NC}"
echo ""
echo "Restart Claude Code and try:"
echo -e "  ${BLUE}/ssl-cert-workflow${NC}"
echo -e "  or say: ${BLUE}帮我申请 SSL 证书${NC}"
