#!/bin/bash

# Script para gerenciar o OLX Webscraping com PM2

case "$1" in
  start)
    echo "🚀 Iniciando OLX Scraper..."
    cd /home/faraujo/projects/olx-webscraping
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
    cd /home/faraujo/projects/olx-webscraping
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
    docker exec olx-webscraping-db mongosh -u felipe -p ghV1XZ7OlojdG42 \
      --authenticationDatabase olx olx --quiet \
      --eval "print('Total:', db.ads.countDocuments())"
    ;;
  db-list)
    echo "📋 Anúncios ordenados por preço:"
    docker exec olx-webscraping-db mongosh -u felipe -p ghV1XZ7OlojdG42 \
      --authenticationDatabase olx olx --quiet \
      --eval "db.ads.find({}, {title: 1, price: 1, location: 1, publishedAt: 1, _id: 0}).sort({price: 1}).forEach(ad => print('R$', ad.price, '-', ad.title.substring(0, 60), '|', ad.location.substring(0, 25)))"
    ;;
  db-clear)
    read -p "⚠️  Tem certeza que deseja limpar TODOS os anúncios? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
      echo "🗑️  Limpando banco de dados..."
      docker exec olx-webscraping-db mongosh -u felipe -p ghV1XZ7OlojdG42 \
        --authenticationDatabase olx olx --quiet \
        --eval "db.ads.deleteMany({}); print('Anúncios removidos!')"
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
    echo "  db-clear    - Remove todos os anúncios do banco"
    echo ""
    exit 1
    ;;
esac
