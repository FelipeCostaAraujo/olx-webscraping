# OLX Webscraping

Uma API e sistema de raspagem de anúncios do OLX, com recursos avançados para:

- **Scraping Dinâmico:** Utiliza Puppeteer como fallback para contornar bloqueios.
- **Armazenamento em MongoDB:** Anúncios são salvos com informações detalhadas, incluindo histórico de preços e classificação.
- **Análise de Sentimento:** Utiliza técnicas de NLP com a biblioteca *Sentiment* para classificar anúncios (ex.: "bom estado", "defeito", "indefinido").
- **Machine Learning:** Um modelo de regressão é treinado com TensorFlow.js para prever a qualidade ou o “valor” dos anúncios com base em features extraídas (preço, dias desde publicação, indicador de bom estado).
- **Notificações Push:** Integração com Firebase Cloud Messaging para enviar notificações quando um anúncio com super preço é detectado ou quando há uma queda significativa de preço.
- **Agendamento de Tarefas:** As buscas são agendadas periodicamente com cron jobs.
- **API RESTful:** Disponibiliza endpoints para listar anúncios, soft-delete (blacklist) e consultar predições.

## Índice

- [Características](#características)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação e Configuração](#instalação-e-configuração)
- [Uso](#uso)
  - [Executando a API](#executando-a-api)
  - [Treinamento do Modelo de IA](#treinamento-do-modelo-de-ia)
  - [Geração do Dataset](#geração-do-dataset)
  - [Endpoint de Predição](#endpoint-de-predição)
- [Contribuição](#contribuição)
- [Licença](#licença)
- [Contato](#contato)

## Características

- **Armazenamento Avançado:** Utiliza MongoDB com Mongoose para armazenar anúncios com detalhes como histórico de preços e classificação de sentimento.
- **NLP e Classificação:** Anúncios são analisados usando a biblioteca *Sentiment* para extrair score, palavras-chave e identificar a condição do anúncio.
- **Machine Learning:** Um modelo de regressão treinado com TensorFlow.js para prever um score de “qualidade” ou “valor” dos anúncios, permitindo destacar boas ofertas.
- **Notificações Push:** Integração com Firebase Cloud Messaging para alertar usuários sobre anúncios com super preços ou quedas de preço.
- **Agendamento:** Busca e raspagem de anúncios são executadas periodicamente via cron jobs.
- **API RESTful:** Endpoints para listar anúncios, realizar soft-delete e consultar predições de anúncios.

## Tecnologias Utilizadas

- **Node.js & TypeScript**
- **Express**
- **MongoDB & Mongoose**
- **Puppeteer**
- **cron & node-cron**
- **TensorFlow.js**
- **Sentiment (NLP)**
- **Firebase Cloud Messaging**

## Estrutura do Projeto

A organização dos arquivos e pastas segue uma estrutura modular que facilita a manutenção e escalabilidade:

```
├── src
│   ├── database.ts             # Conexão com MongoDB
│   ├── server.ts               # Configuração do Express e rotas da API
│   ├── config.ts               # Configurações gerais do projeto
│   ├── models
│   │   ├── Ad.ts               # Schema do anúncio
│   │   └── Notification.ts     # Schema para notificações
│   ├── ml
│   │   ├── trainModel.ts       # Código para treinar o modelo com TensorFlow.js
│   │   ├── predictor.ts        # Código para carregar o modelo e fazer predições
│   │   ├── features.ts         # Extração de features dos anúncios
│   │   └── generateDataset.ts  # Geração do dataset a partir dos dados do MongoDB
│   ├── nlp
│   │   └── classifier.ts       # Classificação e extração de keywords usando Sentiment
│   ├── scraper
│   │   └── scraper.ts          # Lógica de raspagem com Axios/Puppeteer e processamento dos anúncios
│   ├── services
│   │   └── notification-service.ts  # Serviço para envio de notificações push
│   ├── routes
│   │   └── ads.ts              # Endpoints da API para anúncios
│   └── index.ts                # Arquivo principal da API (inicialização, cron jobs, etc.)
├── artifacts
│   ├── data
│   │   └── dataset.json        # Dataset gerado para treinamento do modelo
│   └── model                   # Modelo treinado (model.json, weights.bin, etc.)
├── .env                        # Variáveis de ambiente (ex.: MONGODB_URI)
├── olx-webscraping.json        # Credenciais do Firebase para notificações
├── package.json
└── README.md
```

## Instalação e Configuração

1. **Clone o repositório:**

   ```bash
   git clone https://github.com/FelipeCostaAraujo/olx-webscraping.git
   cd olx-webscraping
   ```

2. **Instale as dependências:**

   ```bash
   npm install
   ```

3. **Configuração das variáveis de ambiente:**

   Crie um arquivo `.env` na raiz do projeto e defina a variável `MONGODB_URI` (e outras que forem necessárias):

   ```env
   MONGODB_URI=mongodb://localhost:27017/olx_webscraping
   PORT=6000
   ```

4. **Configuração do Firebase:**

   Coloque o arquivo `olx-webscraping.json` (credenciais do Firebase) na raiz ou no local apropriado e ajuste o caminho no código de notificações, se necessário.

## Uso

### Executando a API

Para iniciar a API em modo de desenvolvimento:

```bash
npm run dev
```

Para executar a API com PM2 (em produção):

```bash
npm run start:pm2
```

### Treinamento do Modelo de IA

1. **Gerar o Dataset:**

   O script `generateDataset.ts` extrai dados do MongoDB e gera um arquivo JSON com os exemplos:

   ```bash
   npx ts-node src/ml/generateDataset.ts
   ```

2. **Treinar o Modelo:**

   Com o dataset gerado, execute o script de treinamento:

   ```bash
   npx ts-node src/ml/trainModel.ts
   ```

   O modelo treinado será salvo na pasta `artifacts/model`.

### Fazendo Predições

Você pode usar o endpoint de predição ou criar um script (por exemplo, `testPrediction.ts`) para testar as predições:

```bash
npx ts-node src/ml/testPrediction.ts
```

Esse script deverá extrair as features de um anúncio, fazer a predição com o modelo e exibir o score.

### Endpoint de Predição

Uma boa prática é criar um endpoint, por exemplo, `GET /predictions/ads/:id/prediction`, que:
- Recebe o ID do anúncio.
- Extrai as features usando `extractFeaturesFromAd`.
- Chama `predictAdQuality(features)`.
- Retorna o score para o cliente.

## O Que Fazer Com a Predição?

O valor retornado pelo modelo (por exemplo, `-0.063`) é um score que reflete a “qualidade” ou “valor” do anúncio com base nas features. Você pode:

- **Definir Thresholds:** Destacar anúncios com score abaixo de um determinado valor (indicando um bom negócio).
- **Ordenar Anúncios:** Filtrar e ordenar anúncios na interface do usuário conforme o score.
- **Acionar Notificações:** Enviar notificações para usuários quando um anúncio com score abaixo de um limiar é detectado, indicando uma potencial oferta.

## Contribuição

Contribuições são bem-vindas! Se você deseja ajudar:
1. Faça um fork do projeto.
2. Crie uma branch com a sua feature: `git checkout -b minha-feature`
3. Faça suas alterações e commit: `git commit -am 'Adiciona minha feature'`
4. Envie para o fork: `git push origin minha-feature`
5. Abra um Pull Request.

## Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais informações.
