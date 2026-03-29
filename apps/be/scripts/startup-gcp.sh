#!/bin/bash
# =============================================================
# GDP 스피드 퀴즈 — GCP VM 스타트업 스크립트
# 위치: GCP 콘솔 > VM 인스턴스 > 편집 > 자동화 > 시작 스크립트
#
# VM 커스텀 메타데이터에 아래 키를 미리 등록하세요:
#   db-password       : PostgreSQL gdpuser 비밀번호
#   api-key           : 공공데이터 API 키
#   app-name          : 앱인토스 앱 이름 (예: gdp-economy-quiz)
#   git-repo          : git clone URL (예: https://github.com/yourname/gdp-worldcup)
#   admin-email       : Let's Encrypt 인증서 발급용 이메일 (예: admin@example.com)
#   ait-decrypt-key   : 앱인토스 사용자 정보 복호화 키 (이메일 수령)
#   ait-decrypt-aad   : 앱인토스 복호화 AAD (이메일 수령)
#   ait-mtls-cert-b64 : mTLS 공개 인증서 base64 인코딩값 (gdp-quiz-login_public.crt)
#   ait-mtls-key-b64  : mTLS 개인 키 base64 인코딩값 (gdp-quiz-login_private.key)
#
# 인증서 base64 인코딩 방법 (로컬에서 실행):
#   base64 -w 0 gdp-quiz-login_public.crt
#   base64 -w 0 gdp-quiz-login_private.key
# =============================================================

set -e

LOG="/var/log/gdp-startup.log"
exec > >(tee -a "$LOG") 2>&1

echo "========================================"
echo "스타트업 시작: $(date)"
echo "========================================"

# ----------------------------------------------------
# 메타데이터 읽기
# ----------------------------------------------------
META="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
H="Metadata-Flavor: Google"

DB_PASSWORD=$(curl -sf -H "$H" "$META/db-password")
API_KEY=$(curl -sf -H "$H" "$META/api-key")
APP_NAME=$(curl -sf -H "$H" "$META/app-name" || echo "gdp-economy-quiz")
GIT_REPO=$(curl -sf -H "$H" "$META/git-repo")
ADMIN_EMAIL=$(curl -sf -H "$H" "$META/admin-email" || echo "admin@example.com")
AIT_DECRYPT_KEY=$(curl -sf -H "$H" "$META/ait-decrypt-key" || echo "")
AIT_DECRYPT_AAD=$(curl -sf -H "$H" "$META/ait-decrypt-aad" || echo "")
AIT_MTLS_CERT_B64=$(curl -sf -H "$H" "$META/ait-mtls-cert-b64" || echo "")
AIT_MTLS_KEY_B64=$(curl -sf -H "$H" "$META/ait-mtls-key-b64" || echo "")

# 공인 IP → nip.io 도메인 계산
PUBLIC_IP=$(curl -sf -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/externalIp" || curl -sf "https://api.ipify.org" || echo "")
DOMAIN="${PUBLIC_IP//./-}.nip.io"

# 필수 메타데이터 검증
if [ -z "$DB_PASSWORD" ]; then
  echo "ERROR: 메타데이터 'db-password' 가 설정되지 않았습니다."
  exit 1
fi
if [ -z "$API_KEY" ]; then
  echo "ERROR: 메타데이터 'api-key' 가 설정되지 않았습니다."
  exit 1
fi
if [ -z "$GIT_REPO" ]; then
  echo "ERROR: 메타데이터 'git-repo' 가 설정되지 않았습니다."
  exit 1
fi

REPO_DIR="/app/gdp-worldcup"
APP_DIR="$REPO_DIR/apps/be"
APP_USER="appuser"

# ----------------------------------------------------
# 1. 시스템 업데이트 (최초 1회)
# ----------------------------------------------------
if [ ! -f /var/gdp-setup-done ]; then
  echo "[1] 시스템 업데이트..."
  apt-get update -qq
  apt-get upgrade -y -qq
fi

# ----------------------------------------------------
# 2. git 설치
# ----------------------------------------------------
if ! command -v git &>/dev/null; then
  echo "[2] git 설치..."
  apt-get install -y git
fi
echo "git: $(git --version)"

# ----------------------------------------------------
# 3. nginx + certbot 설치
# ----------------------------------------------------
if ! command -v nginx &>/dev/null; then
  echo "[3] nginx + certbot 설치..."
  apt-get install -y nginx certbot python3-certbot-nginx
  systemctl enable nginx
fi
echo "nginx: $(nginx -v 2>&1)"

# ----------------------------------------------------
# 4. Node.js 20 설치
# ----------------------------------------------------
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  echo "[3] Node.js 20 설치..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js: $(node -v)"

# ----------------------------------------------------
# 5. pm2 설치
# ----------------------------------------------------
if ! command -v pm2 &>/dev/null; then
  echo "[4] pm2 설치..."
  npm install -g pm2
fi
echo "pm2: $(pm2 -v)"

# ----------------------------------------------------
# 6. PostgreSQL 설치
# ----------------------------------------------------
if ! command -v psql &>/dev/null; then
  echo "[5] PostgreSQL 설치..."
  apt-get install -y postgresql postgresql-contrib
  systemctl enable postgresql
fi
systemctl start postgresql
echo "PostgreSQL: 실행 중"

# ----------------------------------------------------
# 7. DB & 유저 생성 (멱등성 보장)
# ----------------------------------------------------
echo "[6] DB 설정..."
sudo -u postgres psql -q <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'gdpuser') THEN
    CREATE USER gdpuser WITH PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE gdpworldcup OWNER gdpuser'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'gdpworldcup')\gexec

GRANT ALL PRIVILEGES ON DATABASE gdpworldcup TO gdpuser;
SQL

# ----------------------------------------------------
# 8. 앱 유저 생성
# ----------------------------------------------------
if ! id "$APP_USER" &>/dev/null; then
  echo "[7] 앱 유저 생성..."
  useradd -m -s /bin/bash "$APP_USER"
fi

# ----------------------------------------------------
# 9. 코드 배포 (최초: clone, 이후: pull)
# ----------------------------------------------------
echo "[8] 코드 배포..."
mkdir -p "$REPO_DIR"
git config --global --add safe.directory "$REPO_DIR"

if [ -d "$REPO_DIR/.git" ]; then
  echo "  git pull..."
  git -C "$REPO_DIR" fetch origin
  git -C "$REPO_DIR" reset --hard origin/master
else
  echo "  git clone..."
  git clone "$GIT_REPO" "$REPO_DIR"
fi

chown -R "$APP_USER":"$APP_USER" "$REPO_DIR"

# ----------------------------------------------------
# 9-1. mTLS 인증서 복원
# ----------------------------------------------------
echo "[9-1] mTLS 인증서 복원..."
mkdir -p "$APP_DIR/certs"
if [ -n "$AIT_MTLS_CERT_B64" ]; then
  echo "$AIT_MTLS_CERT_B64" | base64 -d > "$APP_DIR/certs/gdp-quiz-login_public.crt"
  echo "  공개 인증서 복원 완료"
else
  echo "  WARNING: ait-mtls-cert-b64 메타데이터가 없습니다."
fi
if [ -n "$AIT_MTLS_KEY_B64" ]; then
  echo "$AIT_MTLS_KEY_B64" | base64 -d > "$APP_DIR/certs/gdp-quiz-login_private.key"
  echo "  개인 키 복원 완료"
else
  echo "  WARNING: ait-mtls-key-b64 메타데이터가 없습니다."
fi
chmod 600 "$APP_DIR/certs/"*
chown -R "$APP_USER":"$APP_USER" "$APP_DIR/certs"

# ----------------------------------------------------
# 10. .env 생성
# ----------------------------------------------------
echo "[9] .env 생성..."
cat > "$APP_DIR/.env" <<ENV
NODE_ENV=production
PORT=4000
TZ=Asia/Seoul
APP_NAME=$APP_NAME
DATABASE_URL=postgresql://gdpuser:$DB_PASSWORD@localhost:5432/gdpworldcup
PUBLIC_DATA_API_KEY=$API_KEY
PUBLIC_DATA_API_BASE_URL=http://apis.data.go.kr/1262000/OverviewEconomicService/OverviewEconomicList
COUNTRY_CACHE_TTL_SECONDS=604800
AIT_DECRYPT_KEY=$AIT_DECRYPT_KEY
AIT_DECRYPT_AAD=$AIT_DECRYPT_AAD
AIT_MTLS_CERT_PATH=./certs/gdp-quiz-login_public.crt
AIT_MTLS_KEY_PATH=./certs/gdp-quiz-login_private.key
ENV
chown "$APP_USER":"$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

# ----------------------------------------------------
# 11. 패키지 설치 & 빌드
# ----------------------------------------------------
echo "[10] 패키지 설치 & 빌드..."
cd "$APP_DIR"
sudo -u "$APP_USER" npm install
sudo -u "$APP_USER" npx prisma generate
sudo -u "$APP_USER" npx prisma db push --accept-data-loss
sudo -u "$APP_USER" npm run build

# ----------------------------------------------------
# 12. pm2 실행
# ----------------------------------------------------
echo "[11] pm2 시작..."
pm2 delete gdp-worldcup-be 2>/dev/null || true
pm2 start "$APP_DIR/dist/index.js" --name gdp-worldcup-be
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

# ----------------------------------------------------
# 13. nginx HTTPS 설정 (nip.io + Let's Encrypt)
# ----------------------------------------------------
if [ -z "$PUBLIC_IP" ]; then
  echo "[13] 공인 IP를 가져올 수 없어 HTTPS 설정 건너뜀"
else
echo "[13] HTTPS 설정 ($DOMAIN)..."

# SSL 인증서 발급 (certbot은 cert 발급만 담당, nginx 설정은 직접 작성)
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "  Let's Encrypt 인증서 발급 중..."

  # certbot standalone으로 cert만 발급 (nginx 설정 수정 안 함)
  # 먼저 HTTP 블록만 있는 임시 설정으로 80 포트 열기
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
  certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email
else
  echo "  SSL 인증서 이미 존재, 갱신 확인..."
  certbot renew --quiet
fi

# nginx HTTPS 설정 직접 작성 (cert 발급 후)
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

    location / {
        proxy_pass http://localhost:4000;
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
echo "HTTPS 준비 완료: https://$DOMAIN"
fi  # PUBLIC_IP 가드 끝

# ----------------------------------------------------
# 완료 마킹
# ----------------------------------------------------
touch /var/gdp-setup-done

echo "========================================"
echo "스타트업 완료: $(date)"
echo "헬스 체크: curl https://$DOMAIN/health"
echo "========================================"
