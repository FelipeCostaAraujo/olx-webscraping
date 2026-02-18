#!/bin/bash

# Script para gerenciar o OLX Webscraping com PM2
set -euo pipefail

PROJECT_DIR="/home/faraujo/projects/olx-webscraping"
DB_CONTAINER="olx-webscraping-db"
DB_USER="felipe"
DB_PASS="ghV1XZ7OlojdG42"
DB_NAME="olx"

run_mongosh_eval() {
  local eval_script="$1"
  docker exec "${DB_CONTAINER}" mongosh -u "${DB_USER}" -p "${DB_PASS}" \
    --authenticationDatabase "${DB_NAME}" "${DB_NAME}" --quiet \
    --eval "${eval_script}"
}

has_db_container() {
  docker inspect "${DB_CONTAINER}" > /dev/null 2>&1
}

db_count() {
  if has_db_container; then
    run_mongosh_eval "print('Total:', db.ads.countDocuments())"
  else
    cd "${PROJECT_DIR}"
    node -e 'require("dotenv").config(); const mongoose=require("mongoose"); (async()=>{ await mongoose.connect(process.env.MONGODB_URI); const total=await mongoose.connection.db.collection("ads").countDocuments({}); console.log(`Total: ${total}`); await mongoose.disconnect(); })().catch(e=>{ console.error(e.message||e); process.exit(1); });'
  fi
}

db_list() {
  if has_db_container; then
    run_mongosh_eval "db.ads.find({}, {title: 1, price: 1, location: 1, publishedAt: 1, _id: 0}).sort({price: 1}).forEach(ad => print('R$', ad.price, '-', ad.title.substring(0, 60), '|', ad.location.substring(0, 25)))"
  else
    cd "${PROJECT_DIR}"
    node -e 'require("dotenv").config(); const mongoose=require("mongoose"); (async()=>{ await mongoose.connect(process.env.MONGODB_URI); const ads=await mongoose.connection.db.collection("ads").find({}, {projection:{title:1,price:1,location:1,publishedAt:1,_id:0}}).sort({price:1}).toArray(); for (const ad of ads) { const t=(ad.title||"").toString().slice(0,60); const l=(ad.location||"").toString().slice(0,25); console.log(`R$ ${ad.price} - ${t} | ${l}`); } await mongoose.disconnect(); })().catch(e=>{ console.error(e.message||e); process.exit(1); });'
  fi
}

db_blacklist_all() {
  if has_db_container; then
    run_mongosh_eval "const before=db.ads.countDocuments({blacklisted:true}); const total=db.ads.countDocuments({}); const res=db.ads.updateMany({}, {\$set:{blacklisted:true}}); const after=db.ads.countDocuments({blacklisted:true}); printjson({total, beforeBlacklisted:before, matched:res.matchedCount, modified:res.modifiedCount, afterBlacklisted:after});"
  else
    cd "${PROJECT_DIR}"
    node -e 'require("dotenv").config(); const mongoose=require("mongoose"); (async()=>{ await mongoose.connect(process.env.MONGODB_URI); const col=mongoose.connection.db.collection("ads"); const total=await col.countDocuments({}); const before=await col.countDocuments({blacklisted:true}); const res=await col.updateMany({}, {$set:{blacklisted:true}}); const after=await col.countDocuments({blacklisted:true}); console.log(JSON.stringify({total,beforeBlacklisted:before,matched:res.matchedCount,modified:res.modifiedCount,afterBlacklisted:after})); await mongoose.disconnect(); })().catch(e=>{ console.error(e.message||e); process.exit(1); });'
  fi
}

db_clear_all() {
  if has_db_container; then
    run_mongosh_eval "db.ads.deleteMany({}); print('Anúncios removidos!')"
  else
    cd "${PROJECT_DIR}"
    node -e 'require("dotenv").config(); const mongoose=require("mongoose"); (async()=>{ await mongoose.connect(process.env.MONGODB_URI); const res=await mongoose.connection.db.collection("ads").deleteMany({}); console.log(`Anúncios removidos: ${res.deletedCount}`); await mongoose.disconnect(); })().catch(e=>{ console.error(e.message||e); process.exit(1); });'
  fi
}

case "$1" in
  start)
    echo "🚀 Iniciando OLX Scraper..."
    cd "${PROJECT_DIR}"
    npm run build
    pm2 start pm2.config.js
    pm2 save
    ;;
  stop)
    echo "🛑 Parando OLX Scraper..."
    pm2 stop olx-app
    ;;
  restart)
    echo "🔄 Reiniciando OLX Scraper..."
    cd "${PROJECT_DIR}"
    npm run build
    pm2 restart olx-app
    ;;
  status)
    echo "📊 Status do OLX Scraper:"
    pm2 status olx-app
    ;;
  logs)
    echo "📋 Logs do OLX Scraper (Ctrl+C para sair):"
    pm2 logs olx-app
    ;;
  logs-tail)
    echo "📋 Últimas 50 linhas de log:"
    pm2 logs olx-app --lines 50 --nostream
    ;;
  monit)
    echo "📈 Monitoramento em tempo real (Ctrl+C para sair):"
    pm2 monit
    ;;
  db-count)
    echo "📊 Total de anúncios no banco:"
    db_count
    ;;
  db-list)
    echo "📋 Anúncios ordenados por preço:"
    db_list
    ;;
  db-blacklist-all)
    echo "🚫 Marcando todos os anúncios atuais como blacklisted..."
    db_blacklist_all
    ;;
  reset-new-search)
    echo "♻️  Aplicando reset para nova busca (blacklist total + restart)..."
    db_blacklist_all
    cd "${PROJECT_DIR}"
    npm run build
    if pm2 describe olx-app > /dev/null 2>&1; then
      pm2 restart olx-app --update-env
    else
      pm2 start pm2.config.js --update-env
      pm2 save
    fi
    ;;
  db-clear)
    read -p "⚠️  Tem certeza que deseja limpar TODOS os anúncios? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
      echo "🗑️  Limpando banco de dados..."
      db_clear_all
    else
      echo "❌ Operação cancelada"
    fi
    ;;
  *)
    echo "📦 OLX Webscraping - Gerenciador PM2"
    echo ""
    echo "Uso: $0 {comando}"
    echo ""
    echo "Comandos disponíveis:"
    echo "  start       - Compila e inicia a aplicação"
    echo "  stop        - Para a aplicação"
    echo "  restart     - Recompila e reinicia a aplicação"
    echo "  status      - Mostra o status do processo"
    echo "  logs        - Mostra logs em tempo real"
    echo "  logs-tail   - Mostra últimas 50 linhas de log"
    echo "  monit       - Abre monitor em tempo real"
    echo "  db-count    - Mostra quantidade de anúncios salvos"
    echo "  db-list     - Lista anúncios ordenados por preço"
    echo "  db-blacklist-all - Marca todos os anúncios como blacklisted"
    echo "  reset-new-search - Blacklist total e reinicia app com build novo"
    echo "  db-clear    - Remove todos os anúncios do banco"
    echo ""
    exit 1
    ;;
esac
