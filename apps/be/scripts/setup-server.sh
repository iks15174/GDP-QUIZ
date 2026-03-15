#!/bin/bash
# =============================================================
# GDP 스피드 퀴즈 — GCP VM 서버 초기 설정 스크립트
# Ubuntu 22.04 LTS 기준
# 사용법: bash setup-server.sh
# =============================================================

set -e  # 에러 발생 시 즉시 중단

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }

echo ""
echo "================================================"
echo "  GDP 스피드 퀴즈 서버 초기 설정"
echo "================================================"
echo ""

# ----------------------------------------------------
# 0. 입력값 수집
# ----------------------------------------------------
read -p "DB 비밀번호를 입력하세요: " DB_PASSWORD
read -p "공공데이터 API 키를 입력하세요: " PUBLIC_DATA_API_KEY
read -p "앱인토스 앱 이름을 입력하세요 (기본: gdp-worldcup): " APP_NAME
APP_NAME=${APP_NAME:-gdp-worldcup}
read -p "서버 포트 (기본: 4000): " PORT
PORT=${PORT:-4000}

echo ""
warn "아래 설정으로 진행합니다:"
echo "  DB 비밀번호: ****"
echo "  APP_NAME: $APP_NAME"
echo "  PORT: $PORT"
read -p "계속하시겠습니까? (y/N): " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || err "취소되었습니다."

# ----------------------------------------------------
# 1. 시스템 업데이트
# ----------------------------------------------------
log "시스템 패키지 업데이트 중..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# ----------------------------------------------------
# 2. Node.js 20 설치
# ----------------------------------------------------
if command -v node &>/dev/null && [[ "$(node -v)" == v20* ]]; then
  log "Node.js 20 이미 설치됨: $(node -v)"
else
  log "Node.js 20 설치 중..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - -qq
  sudo apt-get install -y nodejs -qq
  log "Node.js 설치 완료: $(node -v)"
fi

# ----------------------------------------------------
# 3. pm2 설치
# ----------------------------------------------------
if command -v pm2 &>/dev/null; then
  log "pm2 이미 설치됨: $(pm2 -v)"
else
  log "pm2 설치 중..."
  sudo npm install -g pm2 -q
  log "pm2 설치 완료: $(pm2 -v)"
fi

# ----------------------------------------------------
# 4. PostgreSQL 설치
# ----------------------------------------------------
if command -v psql &>/dev/null; then
  log "PostgreSQL 이미 설치됨"
else
  log "PostgreSQL 설치 중..."
  sudo apt-get install -y postgresql postgresql-contrib -qq
  sudo systemctl enable postgresql
  sudo systemctl start postgresql
  log "PostgreSQL 설치 완료"
fi

# ----------------------------------------------------
# 5. DB & 유저 생성
# ----------------------------------------------------
log "PostgreSQL DB 설정 중..."
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
log "DB 설정 완료 (database: gdpworldcup, user: gdpuser)"

# ----------------------------------------------------
# 6. 앱 디렉토리 확인
# ----------------------------------------------------
APP_DIR="$(pwd)"
if [[ ! -f "$APP_DIR/package.json" ]]; then
  err "package.json을 찾을 수 없어요. apps/be 디렉토리에서 실행하세요."
fi
log "앱 경로: $APP_DIR"

# ----------------------------------------------------
# 7. .env 파일 생성
# ----------------------------------------------------
log ".env 파일 생성 중..."
cat > "$APP_DIR/.env" <<ENV
# 자동 생성됨: $(date)
NODE_ENV=production
PORT=$PORT
APP_NAME=$APP_NAME
DATABASE_URL=postgresql://gdpuser:$DB_PASSWORD@localhost:5432/gdpworldcup
PUBLIC_DATA_API_KEY=$PUBLIC_DATA_API_KEY
PUBLIC_DATA_API_BASE_URL=http://apis.data.go.kr/1262000/OverviewEconomicService/OverviewEconomicList
COUNTRY_CACHE_TTL_SECONDS=604800
ENV
log ".env 파일 생성 완료"

# ----------------------------------------------------
# 8. npm 패키지 설치
# ----------------------------------------------------
log "패키지 설치 중..."
npm install --production=false -q
log "패키지 설치 완료"

# ----------------------------------------------------
# 9. Prisma 설정
# ----------------------------------------------------
log "Prisma 클라이언트 생성 중..."
npx prisma generate -q

log "DB 스키마 적용 중 (prisma db push)..."
npx prisma db push --accept-data-loss -q
log "DB 스키마 적용 완료"

# ----------------------------------------------------
# 10. 빌드
# ----------------------------------------------------
log "TypeScript 빌드 중..."
npm run build
log "빌드 완료"

# ----------------------------------------------------
# 11. pm2 실행
# ----------------------------------------------------
log "pm2로 서버 시작 중..."
pm2 delete gdp-worldcup-be 2>/dev/null || true
pm2 start dist/index.js --name gdp-worldcup-be
pm2 save

log "pm2 자동 시작 설정 중..."
PM2_STARTUP=$(pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1)
eval "$PM2_STARTUP" 2>/dev/null || warn "pm2 startup 명령어를 수동으로 실행해주세요: $PM2_STARTUP"

# ----------------------------------------------------
# 완료
# ----------------------------------------------------
echo ""
echo "================================================"
log "서버 설정 완료!"
echo ""
echo "  서버 상태 확인: pm2 status"
echo "  로그 확인:      pm2 logs gdp-worldcup-be"
echo "  서버 재시작:    pm2 restart gdp-worldcup-be"
echo "  헬스 체크:      curl http://localhost:$PORT/health"
echo "================================================"
echo ""
