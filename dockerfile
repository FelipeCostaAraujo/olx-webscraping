# Use uma imagem leve do Node.js
FROM node:20-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia o package.json e instala as dependências
COPY package.json ./
RUN npm install

# Copia o restante do código para dentro do container
COPY . .

# Define a porta se o seu app tiver algum servidor (aqui não é necessário, pois é um script agendado)
# EXPOSE 3000

# Comando para iniciar o app
CMD ["node", "index.js"]
