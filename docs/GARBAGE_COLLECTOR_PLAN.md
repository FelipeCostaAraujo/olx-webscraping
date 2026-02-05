# 🗑️ Planejamento do Garbage Collector (Coletor de Lixo)

## 📋 Objetivo

Implementar um sistema automatizado para detectar e marcar como `blacklisted=true` (soft delete) os anúncios que foram:
- **Removidos da OLX** (não aparecem mais nas buscas)
- **Vendidos** (não estão mais disponíveis)

## 🎯 Estratégia

### 1. **Detecção de Anúncios Inativos**

#### Método Principal: Varredura Periódica
- Fazer uma busca específica pelos anúncios salvos no banco
- Verificar se cada anúncio ainda existe na OLX
- Se não existir mais → marcar como `blacklisted: true`

### 2. **Abordagens Possíveis**

#### **Opção A: Verificação Direta por URL** ⭐ (RECOMENDADA)
```
Para cada anúncio no banco:
  1. Acessar a URL do anúncio
  2. Verificar se retorna:
     - 200/OK → Anúncio ainda existe
     - 404/Not Found → Anúncio removido
     - Página com "Anúncio removido" → Anúncio vendido/removido
  3. Se removido → blacklisted = true
```

**Vantagens:**
- ✅ Precisão: Verifica diretamente se o anúncio existe
- ✅ Detecta tanto removidos quanto vendidos
- ✅ Simples de implementar

**Desvantagens:**
- ⚠️ Pode ser lento se tiver muitos anúncios
- ⚠️ Mais requisições à OLX (risco de bloqueio)

#### **Opção B: Verificação nas Buscas Periódicas**
```
Durante o scraping normal:
  1. Guardar lista de URLs encontradas na busca atual
  2. Comparar com anúncios salvos no banco
  3. Anúncios que NÃO aparecem mais → incrementar contador "ausências"
  4. Se ausências >= 3 buscas consecutivas → blacklisted = true
```

**Vantagens:**
- ✅ Não faz requisições extras
- ✅ Usa o scraping que já está rodando
- ✅ Menor risco de bloqueio

**Desvantagens:**
- ⚠️ Menos preciso (anúncio pode estar em páginas posteriores)
- ⚠️ Demora mais para detectar (precisa de N buscas)

#### **Opção C: Híbrida (Opção A + B)** 🌟 (IDEAL)
```
1. Durante scraping: marcar anúncios vistos (lastSeenAt)
2. Garbage Collector periódico:
   - Anúncios não vistos há X dias → verificar URL diretamente
   - Se confirmado removido → blacklisted = true
```

**Vantagens:**
- ✅ Melhor dos dois mundos
- ✅ Eficiente e preciso
- ✅ Otimiza requisições

---

## 🏗️ Implementação Proposta (Opção C - Híbrida)

### **Fase 1: Adicionar Campo `lastSeenAt` ao Schema**

```typescript
// src/models/Ad.ts
const adSchema = new mongoose.Schema({
  // ... campos existentes
  blacklisted: { type: Boolean, default: false },
  lastSeenAt: { type: Date, default: Date.now }, // 🆕 NOVO
  absenceCount: { type: Number, default: 0 },     // 🆕 NOVO (opcional)
  blacklistedAt: { type: Date },                   // 🆕 NOVO (quando foi removido)
  blacklistReason: { type: String }                // 🆕 NOVO (motivo: "removed", "sold", "manual")
});
```

### **Fase 2: Atualizar `lastSeenAt` Durante Scraping**

```typescript
// src/scraper/scraper.ts - método saveAd()
async saveAd(ad: any): Promise<void> {
  const existing = await Ad.findOne({ url: ad.url });
  
  if (existing) {
    // 🆕 Atualizar última vez que foi visto
    existing.lastSeenAt = new Date();
    
    if (existing.price !== ad.price) {
      // ... lógica de atualização de preço
    }
    
    await existing.save();
  } else {
    // Novo anúncio
    ad.lastSeenAt = new Date();
    await Ad.create(ad);
  }
}
```

### **Fase 3: Criar Serviço de Garbage Collector**

```typescript
// src/services/garbage-collector.ts
export class GarbageCollector {
  
  /**
   * Verifica anúncios não vistos recentemente
   */
  async collectGarbage(): Promise<void> {
    const DAYS_THRESHOLD = 1; // Anúncios não vistos há 1 dia (24 horas)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_THRESHOLD);
    
    // Buscar anúncios não vistos há X dias e não blacklisted
    const staleAds = await Ad.find({
      lastSeenAt: { $lt: cutoffDate },
      blacklisted: false
    });
    
    console.log(`[GC] Verificando ${staleAds.length} anúncios antigos...`);
    
    for (const ad of staleAds) {
      const isRemoved = await this.checkIfAdRemoved(ad.url);
      
      if (isRemoved) {
        ad.blacklisted = true;
        ad.blacklistedAt = new Date();
        ad.blacklistReason = 'removed';
        await ad.save();
        console.log(`[GC] ✅ Anúncio removido: ${ad.title}`);
      } else {
        // Anúncio ainda existe, atualizar lastSeenAt
        ad.lastSeenAt = new Date();
        await ad.save();
        console.log(`[GC] ♻️  Anúncio ainda ativo: ${ad.title}`);
      }
    }
  }
  
  /**
   * Verifica se anúncio foi removido da OLX
   */
  async checkIfAdRemoved(url: string): Promise<boolean> {
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Verificar se página contém indicadores de remoção
      const pageText = await page.evaluate(() => document.body.innerText);
      
      await browser.close();
      
      // Padrões que indicam anúncio removido
      const removedPatterns = [
        'anúncio removido',
        'anúncio não encontrado',
        'página não existe',
        'não disponível',
        'foi removido pelo anunciante'
      ];
      
      const isRemoved = removedPatterns.some(pattern => 
        pageText.toLowerCase().includes(pattern)
      );
      
      return isRemoved;
      
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('net::ERR')) {
        return true; // 404 = anúncio removido
      }
      console.error(`[GC] Erro ao verificar ${url}:`, error.message);
      return false;
    }
  }
}
```

### **Fase 4: Agendar Execução Periódica**

```typescript
// src/index.ts
import cron from 'node-cron';
import { GarbageCollector } from './services/garbage-collector';

const gc = new GarbageCollector();

// Executar garbage collector todo dia às 3h da manhã
cron.schedule('0 3 * * *', async () => {
  console.log('[CRON] Iniciando Garbage Collector...');
  await gc.collectGarbage();
  console.log('[CRON] Garbage Collector finalizado.');
});
```

### **Fase 5: Endpoint Manual (Opcional)**

```typescript
// src/routers/ads.ts
router.post('/ads/garbage-collect', async (req, res) => {
  try {
    const gc = new GarbageCollector();
    await gc.collectGarbage();
    res.json({ message: 'Garbage collection completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📊 Configurações Recomendadas

```typescript
// src/config.ts
export const GARBAGE_COLLECTOR_CONFIG = {
  // Dias sem ser visto para verificar
  DAYS_THRESHOLD: 1,
  
  // Frequência de execução (cron)
  SCHEDULE: '0 3 * * *', // 3h da manhã todo dia
  
  // Limite de anúncios a verificar por execução (evitar sobrecarga)
  BATCH_SIZE: 50,
  
  // Delay entre verificações (ms) - evitar bloqueio
  CHECK_DELAY: 2000,
  
  // Timeout para verificação de URL (ms)
  TIMEOUT: 30000,
};
```

---

## 🔄 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    SCRAPER RODANDO                          │
│  - Busca "rtx 4000", "rtx a4000", etc.                     │
│  - Encontra anúncios A, B, C, D                            │
│  - Salva/atualiza no banco                                 │
│  - Define lastSeenAt = NOW para cada um                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              BANCO DE DADOS (MongoDB)                       │
│                                                             │
│  Anúncio A: lastSeenAt = hoje       (ativo)               │
│  Anúncio B: lastSeenAt = hoje       (ativo)               │
│  Anúncio C: lastSeenAt = há 2 dias  (suspeito)            │
│  Anúncio D: lastSeenAt = há 3 dias  (suspeito)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           GARBAGE COLLECTOR (3h da manhã)                   │
│                                                             │
│  1. Busca anúncios com lastSeenAt > 1 dia                 │
│  2. Encontra: Anúncio C (2 dias), Anúncio D (3 dias)     │
│  3. Verifica cada URL:                                     │
│     - Anúncio C → 404 → blacklisted = true                │
│     - Anúncio D → Ainda existe → lastSeenAt = NOW         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    RESULTADO FINAL                          │
│                                                             │
│  Anúncio A: blacklisted = false (ativo)                   │
│  Anúncio B: blacklisted = false (ativo)                   │
│  Anúncio C: blacklisted = true (removido) ✅              │
│  Anúncio D: blacklisted = false (ainda existe)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 Otimizações

### 1. **Verificação em Lotes (Batching)**
```typescript
const batches = chunkArray(staleAds, BATCH_SIZE);
for (const batch of batches) {
  await Promise.all(batch.map(ad => this.checkIfAdRemoved(ad.url)));
  await delay(CHECK_DELAY); // Evitar bloqueio
}
```

### 2. **Cache de Verificações**
```typescript
// Não verificar o mesmo anúncio múltiplas vezes no mesmo dia
if (ad.lastCheckedAt && isToday(ad.lastCheckedAt)) {
  continue; // Pular
}
```

### 3. **Priorização**
```typescript
// Verificar primeiro anúncios mais antigos
const priorityQueue = staleAds.sort((a, b) => 
  a.lastSeenAt.getTime() - b.lastSeenAt.getTime()
);
```

---

## 🧪 Testes

### Cenários de Teste

1. **Anúncio removido pelo anunciante**
   - Criar anúncio de teste
   - Simular remoção (mock 404)
   - Verificar: `blacklisted = true`

2. **Anúncio vendido**
   - Anúncio com texto "Anúncio removido"
   - Verificar: `blacklisted = true`

3. **Anúncio ainda ativo mas não aparece nas primeiras páginas**
   - `lastSeenAt` antigo mas URL ainda funciona
   - Verificar: `lastSeenAt` atualizado, `blacklisted = false`

4. **Erro de rede/timeout**
   - Simular erro de conexão
   - Verificar: Não marca como blacklisted (retry depois)

---

## 📊 Métricas e Logs

```typescript
// Relatório após cada execução
{
  totalChecked: 50,
  blacklisted: 12,
  stillActive: 35,
  errors: 3,
  duration: '5m 32s',
  timestamp: '2025-12-12T03:00:00Z'
}
```

---

## ⚠️ Considerações Importantes

1. **Rate Limiting**: Adicionar delays entre verificações para não sobrecarregar a OLX
2. **Retry Logic**: Se falhar, tentar novamente depois (pode ser erro temporário)
3. **Logging**: Registrar todas as operações para debugging
4. **Notificações**: Opcionalmente notificar sobre anúncios muito bons que foram removidos
5. **Reversibilidade**: Manter soft delete (não deletar permanentemente)

---

## 🎯 Próximos Passos

### Fase 1: Preparação
- [ ] Adicionar novos campos ao schema (`lastSeenAt`, etc)
- [ ] Migrar dados existentes (definir `lastSeenAt = createdAt`)
- [ ] Atualizar scraper para setar `lastSeenAt`

### Fase 2: Implementação
- [ ] Criar classe `GarbageCollector`
- [ ] Implementar método `checkIfAdRemoved()`
- [ ] Implementar método `collectGarbage()`
- [ ] Adicionar testes unitários

### Fase 3: Integração
- [ ] Agendar com cron
- [ ] Adicionar endpoint manual
- [ ] Configurar logs e métricas
- [ ] Adicionar comando ao `./pm2` script

### Fase 4: Monitoramento
- [ ] Monitorar por 1 semana
- [ ] Ajustar thresholds se necessário
- [ ] Otimizar performance

---

## 🚀 Exemplo de Uso

```bash
# Executar manualmente via API
curl -X POST http://localhost:6000/ads/garbage-collect

# Executar via script PM2
./pm2 gc-run

# Ver relatório
./pm2 gc-report

# Ver anúncios blacklisted
./pm2 db-list --blacklisted
```

---

## ✅ Checklist de Implementação

- [ ] Schema atualizado
- [ ] Scraper atualizado
- [ ] GarbageCollector criado
- [ ] Testes implementados
- [ ] Cron agendado
- [ ] Endpoint criado
- [ ] Comando PM2 adicionado
- [ ] Documentação atualizada
- [ ] Logs configurados
- [ ] Monitoramento ativo

---

**Status**: 📝 Planejamento concluído - Aguardando aprovação para implementação
