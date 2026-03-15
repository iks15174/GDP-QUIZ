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
# 3. Node.js 20 설치
# ----------------------------------------------------
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  echo "[3] Node.js 20 설치..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js: $(node -v)"

# ----------------------------------------------------
# 4. pm2 설치
# ----------------------------------------------------
if ! command -v pm2 &>/dev/null; then
  echo "[4] pm2 설치..."
  npm install -g pm2
fi
echo "pm2: $(pm2 -v)"

# ----------------------------------------------------
# 5. PostgreSQL 설치
# ----------------------------------------------------
if ! command -v psql &>/dev/null; then
  echo "[5] PostgreSQL 설치..."
  apt-get install -y postgresql postgresql-contrib
  systemctl enable postgresql
fi
systemctl start postgresql
echo "PostgreSQL: 실행 중"

# ----------------------------------------------------
# 6. DB & 유저 생성 (멱등성 보장)
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
# 7. 앱 유저 생성
# ----------------------------------------------------
if ! id "$APP_USER" &>/dev/null; then
  echo "[7] 앱 유저 생성..."
  useradd -m -s /bin/bash "$APP_USER"
fi

# ----------------------------------------------------
# 8. 코드 배포 (최초: clone, 이후: pull)
# ----------------------------------------------------
echo "[8] 코드 배포..."
mkdir -p "$REPO_DIR"

if [ -d "$REPO_DIR/.git" ]; then
  echo "  git pull..."
  git -C "$REPO_DIR" pull --ff-only
else
  echo "  git clone..."
  git clone "$GIT_REPO" "$REPO_DIR"
fi

chown -R "$APP_USER":"$APP_USER" "$REPO_DIR"

# ----------------------------------------------------
# 9. .env 생성
# ----------------------------------------------------
echo "[9] .env 생성..."
cat > "$APP_DIR/.env" <<ENV
NODE_ENV=production
PORT=4000
APP_NAME=$APP_NAME
DATABASE_URL=postgresql://gdpuser:$DB_PASSWORD@localhost:5432/gdpworldcup
PUBLIC_DATA_API_KEY=$API_KEY
PUBLIC_DATA_API_BASE_URL=http://apis.data.go.kr/1262000/OverviewEconomicService/OverviewEconomicList
COUNTRY_CACHE_TTL_SECONDS=604800
ENV
chown "$APP_USER":"$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

# ----------------------------------------------------
# 10. 패키지 설치 & 빌드
# ----------------------------------------------------
echo "[10] 패키지 설치 & 빌드..."
cd "$APP_DIR"
sudo -u "$APP_USER" npm install
sudo -u "$APP_USER" npx prisma generate
sudo -u "$APP_USER" npx prisma db push --accept-data-loss
sudo -u "$APP_USER" npm run build

# ----------------------------------------------------
# 11. pm2 실행
# ----------------------------------------------------
echo "[11] pm2 시작..."
pm2 delete gdp-worldcup-be 2>/dev/null || true
pm2 start "$APP_DIR/dist/index.js" --name gdp-worldcup-be
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

# ----------------------------------------------------
# 완료 마킹
# ----------------------------------------------------
touch /var/gdp-setup-done

echo "========================================"
echo "스타트업 완료: $(date)"
echo "헬스 체크: curl http://localhost:4000/health"
echo "========================================"
