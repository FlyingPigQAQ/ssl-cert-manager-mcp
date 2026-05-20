#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_URL="https://github.com/FlyingPigQAQ/ssl-cert-manager-mcp"
SKILL_DIR="${HOME}/.claude/skills/ssl-cert-workflow"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

check_node() {
  if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js 18+ first."
  fi

  local node_version
  node_version=$(node -v | sed 's/v//')
  local major_version
  major_version=$(echo "$node_version" | cut -d. -f1)

  if [ "$major_version" -lt 18 ]; then
    error "Node.js $node_version is too old. Please upgrade to Node.js 18+."
  fi

  success "Node.js v$node_version detected"
}

install_mcp_server() {
  info "Installing MCP server..."

  if [ -d "${SCRIPT_DIR}/node_modules" ] && [ -f "${SCRIPT_DIR}/dist/index.js" ]; then
    # Local dev install
    info "Local source detected. Linking globally..."
    cd "$SCRIPT_DIR"
    npm link --silent
  else
    # Remote install from npm or GitHub
    if npm view ssl-cert-manager-mcp version &> /dev/null; then
      info "Installing from npm..."
      npm install -g ssl-cert-manager-mcp --silent
    else
      info "Installing from GitHub..."
      local tmp_dir
      tmp_dir=$(mktemp -d)
      git clone --depth 1 "$REPO_URL" "$tmp_dir" &> /dev/null || error "Failed to clone repository"
      cd "$tmp_dir"
      npm install --silent
      npm run build --silent
      npm link --silent
      cd -
      rm -rf "$tmp_dir"
    fi
  fi

  success "MCP server installed"
}

install_skill() {
  info "Installing Claude Code skill..."

  mkdir -p "$SKILL_DIR"

  if [ -f "${SCRIPT_DIR}/../ssl-cert-workflow/SKILL.md" ]; then
    cp "${SCRIPT_DIR}/../ssl-cert-workflow/SKILL.md" "$SKILL_DIR/"
  elif [ -f "${SCRIPT_DIR}/ssl-cert-workflow/SKILL.md" ]; then
    cp "${SCRIPT_DIR}/ssl-cert-workflow/SKILL.md" "$SKILL_DIR/"
  else
    info "Downloading skill from GitHub..."
    curl -fsSL "${REPO_URL}/raw/main/ssl-cert-workflow/SKILL.md" -o "${SKILL_DIR}/SKILL.md" || error "Failed to download skill"
  fi

  success "Skill installed to ${SKILL_DIR}"
}

init_env() {
  local env_file="${SCRIPT_DIR}/.env"

  if [ -f "$env_file" ]; then
    warn ".env already exists at ${env_file}, skipping initialization"
    return
  fi

  info "Initializing .env configuration..."

  cat > "$env_file" << 'EOF'
# Aliyun DNS API
# https://ram.console.aliyun.com/manage/ak
ALI_ACCESS_KEY_ID=your-access-key-id
ALI_ACCESS_KEY_SECRET=your-access-key-secret
ALI_REGION_ID=cn-hangzhou

# SMTP (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# SSH defaults (optional)
SSH_PRIVATE_KEY_PATH=
SSH_USER=root
SSH_PORT=22

# ACME
ACME_DIRECTORY_URL=https://acme-v02.api.letsencrypt.org/directory
EOF

  success ".env created at ${env_file}"
}

print_next_steps() {
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  Installation Complete!${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo "Next steps:"
  echo ""
  echo "  1. Edit your .env file:"
  if [ -f "${SCRIPT_DIR}/.env" ]; then
    echo -e "     ${BLUE}vi ${SCRIPT_DIR}/.env${NC}"
  else
    echo -e "     ${BLUE}vi /path/to/ssl-cert-manager-mcp/.env${NC}"
  fi
  echo ""
  echo "  2. Configure Claude Code to use the MCP server:"
  echo -e "     ${BLUE}vi .claude/settings.local.json${NC} (project-level)"
  echo -e "     ${BLUE}vi ~/.claude/settings.json${NC} (global)"
  echo ""
  echo "     Example configuration:"
  echo '     {'
  echo '       "enabledMcpjsonServers": ["ssl-cert-manager"],'
  echo '       "env": {'
  echo '         "ALI_ACCESS_KEY_ID": "your-key",'
  echo '         "ALI_ACCESS_KEY_SECRET": "your-secret"'
  echo '       }'
  echo '     }'
  echo ""
  echo "  3. Start Claude Code and say:"
  echo -e "     ${YELLOW}\"/ssl-cert-workflow\"${NC}"
  echo -e "     or"
  echo -e "     ${YELLOW}\"帮我申请 example.com 的证书\"${NC}"
  echo ""
}

main() {
  echo -e "${GREEN}SSL Cert Manager MCP - Installer${NC}"
  echo ""

  check_node
  install_mcp_server
  install_skill

  # Only init .env if running from local source
  if [ -f "${SCRIPT_DIR}/package.json" ]; then
    init_env
  fi

  print_next_steps
}

main "$@"
