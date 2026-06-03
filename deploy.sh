#!/usr/bin/env bash
# Hodi vCard — Déploiement via branche Git "deploy" (orphan + force-push)
# -----------------------------------------------------------------------
# Usage : npm run deploy (ou ./deploy.sh)
#
# Workflow :
#   1. npm run build → produit le dossier ./build/
#   2. Crée un repo Git temporaire avec UNIQUEMENT le contenu de build/
#   3. Force-push ce contenu sur la branche "deploy" du remote `origin`
#   4. Branche `main` reste propre (juste les sources)
#   5. La branche `deploy` n'a qu'un seul commit (overwrite à chaque deploy)
#
# Sur le serveur cPanel Terminal :
#   cd ~/hodi-vcard && git pull
#   → met à jour public_html/vcard via symlink (configuré une fois pour toutes)

set -euo pipefail

# Couleurs terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

err() { echo -e "${RED}❌ $*${NC}" >&2; exit 1; }
info() { echo -e "${BLUE}▸ $*${NC}"; }
ok() { echo -e "${GREEN}✓ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠  $*${NC}"; }

cd "$(dirname "$0")"

# --- Pre-flight checks ------------------------------------------------------
DEPLOY_BRANCH="${DEPLOY_BRANCH:-deploy}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
	err "Pas un repo git. Initialise avec : git init && git remote add origin <URL>"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
	err "Pas de remote 'origin'. Ajoute-le : git remote add origin git@github.com:USER/REPO.git"
fi

ORIGIN_URL=$(git remote get-url origin)

# .env n'est plus requis (le front-end n'a plus de clés Supabase depuis la
# migration MySQL+PHP). La config back-end vit dans api/config.local.php côté serveur.
if [[ ! -f .env ]]; then
	warn ".env absent — OK (plus de clés VITE_* requises depuis la migration MySQL/PHP)."
fi

# --- Build production -------------------------------------------------------
info "Build production…"
rm -rf build
npm run build
[[ -d build ]] || err "Le dossier build/ n'a pas été créé."
FILE_COUNT=$(find build -type f | wc -l | xargs)
ok "Build OK ($FILE_COUNT fichiers générés)"

# --- Push vers la branche "deploy" ------------------------------------------
info "Préparation du push sur branche ${BOLD}${DEPLOY_BRANCH}${NC}${BLUE} de ${ORIGIN_URL}…${NC}"

# Repo Git éphémère contenant uniquement le contenu de build/
TEMP_DIR=$(mktemp -d -t hodi-vcard-deploy-XXXXXX)
trap "rm -rf '$TEMP_DIR'" EXIT

cp -R build/. "$TEMP_DIR/"

# Ne jamais déployer la config locale (identifiants DB/SMTP de dev). La prod
# utilise son propre api/config.local.php placé sur le serveur, hors dépôt.
rm -f "$TEMP_DIR/api/config.local.php"

(
	cd "$TEMP_DIR"
	git init --quiet --initial-branch="$DEPLOY_BRANCH"
	git add -A
	git -c user.email="deploy@hodi.live" -c user.name="Hodi vCard Deploy" \
		commit --quiet -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')"
	git push --force --quiet "$ORIGIN_URL" "HEAD:${DEPLOY_BRANCH}"
)

ok "Branche ${DEPLOY_BRANCH} mise à jour sur GitHub"
echo
echo -e "${BOLD}Maintenant côté serveur :${NC}"
echo -e "  Ouvre ${YELLOW}cPanel → Terminal${NC} et tape :"
echo
echo -e "    ${GREEN}cd ~/hodi-vcard && git pull${NC}"
echo
echo -e "  Site live : ${BOLD}https://www.hodi.live/vcard/${NC}"
