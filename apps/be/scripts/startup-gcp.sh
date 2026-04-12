#!/bin/bash
# =============================================================
# 통합 GCP VM 스타트업/배포 스크립트
# GDP 스피드 퀴즈 + 우리사이 밸런스 게임
#
# 사용법:
#   전체 초기 셋업 (VM 최초 시작):  bash startup-gcp.sh
#   GDP 퀴즈만 재배포:              bash startup-gcp.sh gdp
#   밸런스 게임만 재배포:           bash startup-gcp.sh balance
#
# ── VM 메타데이터 키 목록 ──────────────────────────────────
# [공통]
#   db-password        : PostgreSQL gdpuser 비밀번호 (두 앱 공용)
#   admin-email        : Let's Encrypt 인증서 발급용 이메일
#
# [GDP 퀴즈]
#   api-key            : 공공데이터 API 키
#   app-name           : 앱인토스 앱 이름 (예: gdp-economy-quiz)
#   git-repo           : GDP 퀴즈 git clone URL
#   ait-decrypt-key    : 앱인토스 사용자 정보 복호화 키
#   ait-decrypt-aad    : 앱인토스 복호화 AAD
#   ait-mtls-cert-b64  : mTLS 공개 인증서 base64 인코딩값
#   ait-mtls-key-b64   : mTLS 개인 키 base64 인코딩값
#   ait-promotion-code : 앱인토스 프로모션 코드 ID
#   ait-unlink-secret  : 앱인토스 unlink 시크릿
#
# [밸런스 게임] ← 신규 추가
#   balance-git-repo   : 밸런스 게임 git clone URL
#   balance-admin-key  : 어드민 API 시크릿 (X-Admin-Key 헤더용)
#   balance-branch     : 브랜치명 (기본값: main)
#
# ── DB 구조 ────────────────────────────────────────────────
#   두 앱이 동일한 DB 유저/DB를 사용하고 스키마로 분리합니다:
#   gdpworldcup DB
#   ├── public  스키마 → GDP 퀴즈 테이블 (기존)
#   └── balance 스키마 → 밸런스 게임 테이블 (신규)
#
# ── nginx 라우팅 ────────────────────────────────────────────
#   https://{domain}/          → localhost:4000 (GDP 퀴즈)
#   https://{domain}/balance/  → localhost:4001 (밸런스 게임)
#
# 인증서 base64 인코딩 방법 (로컬에서 실행):
#   base64 -w 0 gdp-quiz-login_public.crt
#   base64 -w 0 gdp-quiz-login_private.key
# =============================================================

set -e

LOG="/var/log/gdp-startup.log"
exec > >(tee -a "$LOG") 2>&1

# ── 메타데이터 읽기 ────────────────────────────────────────
META="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
H="Metadata-Flavor: Google"
_meta() { curl -sf -H "$H" "$META/$1" || echo "${2:-}"; }

TARGET="${1:-$(_meta deploy-target "all")}"   # gdp | balance | all(기본) — 메타데이터 'deploy-target' 으로도 제어 가능

echo "========================================"
echo "스타트업 시작: $(date)  대상: $TARGET"
echo "========================================"

# 공통
DB_PASSWORD=$(_meta db-password)
ADMIN_EMAIL=$(_meta admin-email "admin@example.com")

# GDP
API_KEY=$(_meta api-key)
APP_NAME=$(_meta app-name "gdp-economy-quiz")
GIT_REPO=$(_meta git-repo)
AIT_DECRYPT_KEY=$(_meta ait-decrypt-key)
AIT_DECRYPT_AAD=$(_meta ait-decrypt-aad)
AIT_UNLINK_SECRET=$(_meta ait-unlink-secret)
AIT_MTLS_CERT_B64=$(_meta ait-mtls-cert-b64)
AIT_MTLS_KEY_B64=$(_meta ait-mtls-key-b64)
AIT_PROMOTION_CODE=$(_meta ait-promotion-code)

# 밸런스 게임
BALANCE_GIT_REPO=$(_meta balance-git-repo)
BALANCE_ADMIN_KEY=$(_meta balance-admin-key "change-me")
BALANCE_BRANCH=$(_meta balance-branch "main")
BALANCE_MTLS_CERT_B64=$(_meta balance-mtls-cert-b64)
BALANCE_MTLS_KEY_B64=$(_meta balance-mtls-key-b64)
BALANCE_UNLINK_SECRET=$(_meta balance-unlink-secret)
BALANCE_DECRYPT_KEY=$(_meta balance-decrypt-key "")
BALANCE_DECRYPT_AAD=$(_meta balance-decrypt-aad "")

# 공인 IP → nip.io 도메인 계산
PUBLIC_IP=$(curl -sf -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/externalIp" \
  || curl -sf "https://api.ipify.org" || echo "")
DOMAIN="${PUBLIC_IP//./-}.nip.io"

# 필수 메타데이터 검증
if [ -z "$DB_PASSWORD" ]; then
  echo "ERROR: 메타데이터 'db-password' 가 설정되지 않았습니다."
  exit 1
fi
if [ "$TARGET" = "all" ] || [ "$TARGET" = "gdp" ]; then
  if [ -z "$API_KEY" ]; then
    echo "ERROR: 메타데이터 'api-key' 가 설정되지 않았습니다."
    exit 1
  fi
  if [ -z "$GIT_REPO" ]; then
    echo "ERROR: 메타데이터 'git-repo' 가 설정되지 않았습니다."
    exit 1
  fi
fi
if [ "$TARGET" = "all" ] || [ "$TARGET" = "balance" ]; then
  if [ -z "$BALANCE_GIT_REPO" ]; then
    echo "ERROR: 메타데이터 'balance-git-repo' 가 설정되지 않았습니다."
    exit 1
  fi
fi

GDP_REPO_DIR="/app/gdp-worldcup"
GDP_APP_DIR="$GDP_REPO_DIR/apps/be"
GDP_PORT=4000
GDP_PM2_NAME="gdp-worldcup-be"

BALANCE_REPO_DIR="/app/we-balance-game"
BALANCE_APP_DIR="$BALANCE_REPO_DIR/backend"
BALANCE_PORT=4001
BALANCE_PM2_NAME="we-balance-game-be"

DB_NAME="gdpworldcup"
DB_USER="gdpuser"
APP_USER="appuser"

# ══════════════════════════════════════════════════════════════
# 공통 인프라 셋업 함수 (멱등성 보장)
# ══════════════════════════════════════════════════════════════

setup_system() {
  if [ -f /var/gdp-setup-done ]; then
    echo "[시스템] 이미 셋업됨, 건너뜀"
    return
  fi
  echo "[1] 시스템 업데이트..."
  apt-get update -qq
  apt-get upgrade -y -qq
}

setup_tools() {
  if ! command -v git &>/dev/null; then
    echo "[2] git 설치..."
    apt-get install -y git
  fi
  echo "git: $(git --version)"

  if ! command -v nginx &>/dev/null; then
    echo "[3] nginx + certbot 설치..."
    apt-get install -y nginx certbot python3-certbot-nginx
    systemctl enable nginx
  fi
  echo "nginx: $(nginx -v 2>&1)"

  if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
    echo "[4] Node.js 20 설치..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
  echo "Node.js: $(node -v)"

  if ! command -v pm2 &>/dev/null; then
    echo "[5] pm2 설치..."
    npm install -g pm2
  fi
  echo "pm2: $(pm2 -v)"
}

setup_postgresql() {
  if ! command -v psql &>/dev/null; then
    echo "[6] PostgreSQL 설치..."
    apt-get install -y postgresql postgresql-contrib
    systemctl enable postgresql
  fi
  systemctl start postgresql
  echo "PostgreSQL: 실행 중"

  echo "[7] DB 설정 (gdpworldcup / gdpuser)..."
  sudo -u postgres psql -q <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
SQL
}

setup_app_user() {
  if ! id "$APP_USER" &>/dev/null; then
    echo "[8] 앱 유저 생성..."
    useradd -m -s /bin/bash "$APP_USER"
  fi
}

# ── nginx: path 기반 라우팅 (/  → 4000, /balance/ → 4001) ─
setup_nginx() {
  if [ -z "$PUBLIC_IP" ]; then
    echo "[nginx] 공인 IP를 가져올 수 없어 HTTPS 설정 건너뜀"
    return
  fi
  echo "[nginx] HTTPS 설정 ($DOMAIN)..."

  if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "  Let's Encrypt 인증서 발급 중..."
    cat > /etc/nginx/sites-available/gdp-api <<NGINX_TMP
server {
    listen 80;
    server_name $DOMAIN;
    location / { return 200 'ok'; }
}
NGINX_TMP
    ln -sf /etc/nginx/sites-available/gdp-api /etc/nginx/sites-enabled/gdp-api
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    rm -rf /etc/letsencrypt
    certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos \
      --register-unsafely-without-email
  else
    echo "  SSL 인증서 이미 존재, 갱신 확인..."
    certbot renew --quiet
  fi

  cat > /etc/nginx/sites-available/gdp-api <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # ── 밸런스 게임 API (port $BALANCE_PORT) ─────────────
    # trailing slash 가 /balance/ prefix 를 제거 후 전달
    location /balance/ {
        proxy_pass http://localhost:$BALANCE_PORT/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # ── GDP 퀴즈 (port $GDP_PORT) ────────────────────────
    location / {
        proxy_pass http://localhost:$GDP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

  ln -sf /etc/nginx/sites-available/gdp-api /etc/nginx/sites-enabled/gdp-api
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  echo "HTTPS 준비 완료"
  echo "  GDP  퀴즈  : https://$DOMAIN/"
  echo "  밸런스게임 : https://$DOMAIN/balance/"
}

# ══════════════════════════════════════════════════════════════
# GDP 퀴즈 배포 (기존 로직 그대로 보존)
# ══════════════════════════════════════════════════════════════
deploy_gdp() {
  echo "──────────────────────────────────────"
  echo "GDP 퀴즈 배포 시작"
  echo "──────────────────────────────────────"

  echo "[코드] 배포..."
  mkdir -p "$GDP_REPO_DIR"
  git config --global --add safe.directory "$GDP_REPO_DIR"
  if [ -d "$GDP_REPO_DIR/.git" ]; then
    echo "  git pull..."
    git -C "$GDP_REPO_DIR" fetch origin
    git -C "$GDP_REPO_DIR" reset --hard origin/master
  else
    echo "  git clone..."
    git clone "$GIT_REPO" "$GDP_REPO_DIR"
  fi
  chown -R "$APP_USER":"$APP_USER" "$GDP_REPO_DIR"

  echo "[mTLS] 인증서 복원..."
  mkdir -p "$GDP_APP_DIR/certs"
  if [ -n "$AIT_MTLS_CERT_B64" ]; then
    echo "$AIT_MTLS_CERT_B64" | base64 -d > "$GDP_APP_DIR/certs/gdp-quiz-login_public.crt"
    echo "  공개 인증서 복원 완료"
  else
    echo "  WARNING: ait-mtls-cert-b64 메타데이터가 없습니다."
  fi
  if [ -n "$AIT_MTLS_KEY_B64" ]; then
    echo "$AIT_MTLS_KEY_B64" | base64 -d > "$GDP_APP_DIR/certs/gdp-quiz-login_private.key"
    echo "  개인 키 복원 완료"
  else
    echo "  WARNING: ait-mtls-key-b64 메타데이터가 없습니다."
  fi
  chmod 600 "$GDP_APP_DIR/certs/"*
  chown -R "$APP_USER":"$APP_USER" "$GDP_APP_DIR/certs"

  echo "[.env] 생성..."
  cat > "$GDP_APP_DIR/.env" <<ENV
NODE_ENV=production
PORT=$GDP_PORT
TZ=Asia/Seoul
APP_NAME=$APP_NAME
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
PUBLIC_DATA_API_KEY=$API_KEY
PUBLIC_DATA_API_BASE_URL=http://apis.data.go.kr/1262000/OverviewEconomicService/OverviewEconomicList
COUNTRY_CACHE_TTL_SECONDS=604800
AIT_DECRYPT_KEY=$AIT_DECRYPT_KEY
AIT_DECRYPT_AAD=$AIT_DECRYPT_AAD
AIT_UNLINK_SECRET=$AIT_UNLINK_SECRET
AIT_MTLS_CERT_PATH=./certs/gdp-quiz-login_public.crt
AIT_MTLS_KEY_PATH=./certs/gdp-quiz-login_private.key
AIT_PROMOTION_CODE=$AIT_PROMOTION_CODE
AIT_PROMOTION_AMOUNT=1
ENV
  chown "$APP_USER":"$APP_USER" "$GDP_APP_DIR/.env"
  chmod 600 "$GDP_APP_DIR/.env"

  echo "[빌드] 패키지 설치 & 빌드..."
  cd "$GDP_APP_DIR"
  sudo -u "$APP_USER" npm install
  sudo -u "$APP_USER" npx prisma generate
  sudo -u "$APP_USER" npx prisma db push --accept-data-loss
  sudo -u "$APP_USER" npm run build

  echo "[pm2] 시작..."
  pm2 delete "$GDP_PM2_NAME" 2>/dev/null || true
  pm2 start "$GDP_APP_DIR/dist/index.js" \
    --name "$GDP_PM2_NAME" \
    --node-args="--env-file=$GDP_APP_DIR/.env"
  pm2 save
  env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root
  systemctl enable pm2-root

  echo "[GDP] 배포 완료 (port $GDP_PORT)"
}

# ══════════════════════════════════════════════════════════════
# 밸런스 게임 배포
# ══════════════════════════════════════════════════════════════
deploy_balance() {
  echo "──────────────────────────────────────"
  echo "밸런스 게임 배포 시작"
  echo "──────────────────────────────────────"

  echo "[코드] 배포..."
  mkdir -p "$BALANCE_REPO_DIR"
  git config --global --add safe.directory "$BALANCE_REPO_DIR"
  if [ -d "$BALANCE_REPO_DIR/.git" ]; then
    echo "  git pull..."
    git -C "$BALANCE_REPO_DIR" fetch origin
    git -C "$BALANCE_REPO_DIR" reset --hard "origin/$BALANCE_BRANCH"
  else
    echo "  git clone..."
    git clone "$BALANCE_GIT_REPO" "$BALANCE_REPO_DIR"
  fi
  chown -R "$APP_USER":"$APP_USER" "$BALANCE_REPO_DIR"

  echo "[mTLS] 인증서 복원..."
  mkdir -p "$BALANCE_APP_DIR/certs"
  if [ -n "$BALANCE_MTLS_CERT_B64" ]; then
    echo "$BALANCE_MTLS_CERT_B64" | base64 -d > "$BALANCE_APP_DIR/certs/balance-cert.pem"
    echo "  공개 인증서 복원 완료"
  else
    echo "  WARNING: balance-mtls-cert-b64 메타데이터가 없습니다."
  fi
  if [ -n "$BALANCE_MTLS_KEY_B64" ]; then
    echo "$BALANCE_MTLS_KEY_B64" | base64 -d > "$BALANCE_APP_DIR/certs/balance-key.pem"
    echo "  개인 키 복원 완료"
  else
    echo "  WARNING: balance-mtls-key-b64 메타데이터가 없습니다."
  fi
  chmod 600 "$BALANCE_APP_DIR/certs/"*
  chown -R "$APP_USER":"$APP_USER" "$BALANCE_APP_DIR/certs"

  # DATABASE_URL 에 ?schema=balance → gdpworldcup DB 내 balance 스키마 사용
  echo "[.env] 생성..."
  cat > "$BALANCE_APP_DIR/.env" <<ENV
NODE_ENV=production
PORT=$BALANCE_PORT
TZ=Asia/Seoul
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=balance
ADMIN_SECRET_KEY=$BALANCE_ADMIN_KEY
AIT_MTLS_CERT_PATH=./certs/balance-cert.pem
AIT_MTLS_KEY_PATH=./certs/balance-key.pem
AIT_UNLINK_SECRET=$BALANCE_UNLINK_SECRET
AIT_DECRYPT_KEY=$BALANCE_DECRYPT_KEY
AIT_DECRYPT_AAD=$BALANCE_DECRYPT_AAD
ENV
  chown "$APP_USER":"$APP_USER" "$BALANCE_APP_DIR/.env"
  chmod 600 "$BALANCE_APP_DIR/.env"

  echo "[빌드] 패키지 설치 & 빌드..."
  cd "$BALANCE_APP_DIR"
  sudo -u "$APP_USER" npm install
  sudo -u "$APP_USER" npx prisma generate
  sudo -u "$APP_USER" npx prisma db push --accept-data-loss
  sudo -u "$APP_USER" npm run db:seed || echo "  seed 이미 존재, 건너뜀"
  sudo -u "$APP_USER" npm run build

  echo "[pm2] 시작..."
  pm2 delete "$BALANCE_PM2_NAME" 2>/dev/null || true
  pm2 start "$BALANCE_APP_DIR/dist/app.js" \
    --name "$BALANCE_PM2_NAME" \
    --node-args="--env-file=$BALANCE_APP_DIR/.env"
  pm2 save
  env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root
  systemctl enable pm2-root

  echo "[밸런스] 배포 완료 (port $BALANCE_PORT)"
}

# ══════════════════════════════════════════════════════════════
# 메인 실행 흐름
# ══════════════════════════════════════════════════════════════
case "$TARGET" in
  gdp)
    # GDP만 재배포 — 인프라는 이미 셋업되어 있다고 가정
    setup_postgresql
    deploy_gdp
    ;;
  balance)
    # 밸런스 게임만 재배포 — nginx도 갱신 (location 블록 포함)
    setup_postgresql
    deploy_balance
    setup_nginx
    ;;
  all|*)
    # 전체 초기 셋업 또는 전체 재배포
    setup_system
    setup_tools
    setup_postgresql
    setup_app_user
    deploy_gdp
    deploy_balance
    setup_nginx
    touch /var/gdp-setup-done
    ;;
esac

# ── 완료 요약 ─────────────────────────────────────────────
echo ""
echo "========================================"
echo "완료: $(date)"
case "$TARGET" in
  gdp)
    echo "GDP 퀴즈  : https://$DOMAIN/"
    echo "헬스 체크 : curl https://$DOMAIN/health"
    ;;
  balance)
    echo "밸런스 게임 : https://$DOMAIN/balance"
    echo "헬스 체크   : curl https://$DOMAIN/balance/health"
    echo "Admin 예시  : curl -H 'X-Admin-Key: $BALANCE_ADMIN_KEY' https://$DOMAIN/balance/api/admin/topics"
    echo ""
    echo "프론트 .env → VITE_API_URL=https://$DOMAIN/balance"
    ;;
  *)
    echo "GDP  퀴즈  : https://$DOMAIN/"
    echo "밸런스게임 : https://$DOMAIN/balance"
    echo "헬스 체크  : curl https://$DOMAIN/health"
    echo "             curl https://$DOMAIN/balance/health"
    ;;
esac
echo "========================================"
