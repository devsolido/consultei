# 📋 Relatório Técnico — Sistema de Carrinho Inteligente Mateus Mais

**Data:** 13/09/2026
**Objetivo:** Documentar toda a engenharia reversa feita até agora, para iniciar o desenvolvimento do sistema de carrinho de compras pessoal baseado nos preços do site Mateus Mais.

---

## 1. Visão Geral do Projeto

**O que é:** Um app pessoal (celular) onde o usuário:
1. Digita o nome de um produto enquanto faz compras fisicamente no mercado
2. O sistema consulta o preço no site do Mateus Mais em tempo real
3. Adiciona ao carrinho com quantidade
4. Mostra o total acumulado e a localização física do produto na loja

**Problema que resolve:** Saber o total da compra antes de chegar ao caixa, evitar surpresas, e localizar produtos por corredor/prateleira.

---

## 2. Alvo da Integração

**Site:** https://mateusmais.com.br
**Rede:** Grupo Mateus (MA/PA)
**Plataforma:** E-commerce da **Standout** + busca via **Meilisearch**

### Stack identificada
| Componente | Tecnologia |
|---|---|
| Frontend | Angular (SPA) |
| Backend | Volterra / F5 Distributed Cloud (`server: volt-adc`) |
| Busca | Meilisearch (proxy interno) |
| Imagens | ImageKit (`ik.imagekit.io/glm5kjz1tud`) |
| CDN | AWS S3 (assets.standout.com.br) |

---

## 3. Endpoint Principal

### 3.1 Busca de produtos

```http
POST https://app.mateusmais.com.br/api/products/internal/v1/service/*/queries
Content-Type: application/json
Origin: https://mateusmais.com.br
Referer: https://mateusmais.com.br/
```

**Observação:** O `*` no path é literal (aparentemente um placeholder que o backend resolve internamente). Testes práticos ainda não foram executados — **esta é a primeira tarefa a validar.**

### 3.2 Autocomplete (opcional, para UX)

```http
POST https://app.mateusmais.com.br/api/products/internal/v1/service/autocomplete
```

### 3.3 Payload (formato Meilisearch)

```json
{
  "requests": [
    {
      "title": "Mateus Mais Express⚡️::Mateus Mais Express⚡️",
      "params": "hitsPerPage=12&clickAnalytics=true&facetFilters=[[\"market_id:14ae828b-491f-42fc-8247-5089f6613750\"],[\"for_sale:true\"]]&facets=[\"brand\",\"nodes\"]&query=nescau",
      "indexName": "SHOWCASE_catalog_product_api_index_PROD"
    }
  ],
  "service": "meilisearch"
}
```

**Parâmetros da query string (dentro de `params`):**
| Param | Descrição |
|---|---|
| `hitsPerPage` | Itens por página (site usa 12) |
| `clickAnalytics` | Telemetria (mantemos `true` por paridade) |
| `facetFilters` | Filtros: `market_id`, `for_sale` |
| `facets` | Agrupamentos: `brand`, `nodes` |
| `query` | Termo de busca |

**Índice:** `SHOWCASE_catalog_product_api_index_PROD`

### 3.4 Response (formato)

```json
{
  "results": [
    {
      "hits": [
        {
          "objectID": "35c5b0ae-...",
          "barcode": "7891000338087",
          "name": "Achocolatado em Pó Nescau 550g",
          "brand": "NESCAU",
          "category": "Achocolatado em Pó",
          "departament_name": "Mercearia",
          "section_name": "Matinais",
          "price": 21.62,
          "sale_price": 18.90,
          "low_price": 18.90,
          "amount_in_stock": 147.0,
          "measure": 550.0,
          "measure_type": "G",
          "sku": 450964,
          "physical_location": " CID: 1 BAI: 1 RUA: 6 PRE: 26 NIV: 0 APT: 201",
          "market_id": "14ae828b-491f-42fc-8247-5089f6613750",
          "market_name": "Mateus Mais Express⚡️",
          "small_image": "https://ik.imagekit.io/.../7891000338087.png?tr=w-200",
          "image": "https://ik.imagekit.io/.../7891000338087.png?tr=w-600",
          "for_sale": true,
          "updated_at": "2026-09-13 22:09:07.667753+00:00"
        }
      ]
    }
  ]
}
```

---

## 4. Mapeamento de Campos (o que usar)

| Campo do JSON | Tipo | Uso no sistema |
|---|---|---|
| `barcode` | string (EAN-13) | **Chave única** do produto |
| `objectID` | UUID | Chave interna (usar como fallback) |
| `sku` | int | Código interno da loja |
| `name` | string | Exibição |
| `brand` | string | Agrupamento/filtro |
| `category` / `departament_name` | string | Categoria |
| `price` | float | Preço cheio |
| `sale_price` | float | **Preço efetivo** (usar este) |
| `low_price` | float/null | Menor preço histórico |
| `amount_in_stock` | float | Estoque |
| `for_sale` | bool | Filtrar sempre `true` |
| `measure` + `measure_type` | float + string | Peso/volume (`550 G`, `180 ML`) |
| `physical_location` | string | **Localização física no mercado** |
| `market_id` | UUID | Loja |
| `market_name` | string | Nome da loja |
| `small_image` | URL | Thumbnail |
| `updated_at` | ISO datetime | Frescor do dado |

**Regra de preço:** usar `sale_price` se disponível e `> 0`; senão `price`. Promoção quando `sale_price < price`.

---

## 5. IDs de Lojas Conhecidos

| Loja | market_id |
|---|---|
| Mateus Mais Express⚡️ | `14ae828b-491f-42fc-8247-5089f6613750` |
| Supermercado Mateus Cohama | `2857c51e-ffc9-4365-b39a-0156cfc032b9` |
| Mateus Food Express - São Luís | `f7a3a08f-12bf-4507-ae1b-81d8c02790cf` |
| Mateus Express - Parque Alvorada | `a38d9f27-6df8-4671-a82a-c2d942025f92` |
| Eletro Mateus Grande São Luís | `e0eb5184-8da4-43da-9632-aa3a8c1bde79` |
| Mais Fraldas Aririzal | `6927aeda-cbd2-4ac4-b858-7e0b5bba0da8` |
| Mix Toureiro Farma | `aecc010b-a588-4fcb-8b1d-1a22062aea67` |
| Armazzem Pet Rio Poty | `db56f0ee-c350-4e02-a3b7-fb9c573e237f` |

**Nota:** o usuário precisa escolher qual loja fixar (preço varia por loja). Sugestão: deixar configurável e fazer auto-detecção via geolocalização.

---

## 6. Requisitos Funcionais (MVP)

### 6.1 Busca e adição
- [ ] Campo de busca com **autocomplete** (debounce ~300ms)
- [ ] Lista de resultados com nome, preço, imagem e localização
- [ ] Botão "adicionar" + seletor de quantidade
- [ ] Diferenciação visual para produtos em promoção

### 6.2 Carrinho
- [ ] Lista de itens adicionados
- [ ] Editar quantidade / remover
- [ ] Total em tempo real
- [ ] Total economizado (soma de `price - sale_price`)
- [ ] Agrupamento por categoria/corredor (para otimizar a rota no mercado)

### 6.3 Persistência
- [ ] Carrinho salvo localmente (localStorage/IndexedDB) — não perder se fechar o app
- [ ] Histórico de compras
- [ ] Cache de preços por ~10 min (dados são atualizados agora, conforme `updated_at`)

### 6.4 Modo offline
- [ ] Preços da última consulta ficam disponíveis sem internet
- [ ] Fila de operações para sincronizar quando voltar conexão

---

## 7. Requisitos Não-Funcionais

| Item | Meta |
|---|---|
| Tempo de resposta da busca | < 1s |
| Interface | Mobile-first (PWA) |
| Autenticação | Nenhuma no MVP (API é pública) |
| Persistência servidor | Nenhuma no MVP (tudo local) |
| Idioma | pt-BR |
| Compatibilidade | Chrome/Edge mobile |

---

## 8. Arquitetura Proposta

```
┌─────────────────────────┐
│   Celular (PWA)         │
│   - Busca               │
│   - Carrinho            │
│   - localStorage        │
└───────────┬─────────────┘
            │ HTTPS
            ▼
┌─────────────────────────┐
│  Backend próprio        │
│  (Node + Express)       │
│  - Proxy para Mateus    │
│  - Cache                │
│  - Normalização         │
└───────────┬─────────────┘
            │ HTTPS
            ▼
┌─────────────────────────┐
│  API Mateus Mais        │
│  (app.mateusmais...)    │
└─────────────────────────┘
```

**Por que um backend próprio?**
1. **CORS e headers:** evita depender de configurações do navegador
2. **Cache:** reduz chamadas repetidas
3. **Rate limiting:** não abusar da API deles
4. **Futuro:** permite adicionar features (login, sync, comparação com outras redes)

**Alternativa mais simples (MVP puro):** chamar a API direto do PWA, já que `access-control-allow-origin: *`. Funciona, mas perde cache e tratamento de erro.

---

## 9. Riscos e Pontos de Atenção

| Risco | Probabilidade | Mitigação |
|---|---|---|
| O `*` no path não funcionar direto | Média | Testar; se falhar, usar a URL exata capturada no DevTools |
| Backend exigir cookies/token | Média | Testar via Console do site (já tem sessão); se necessário, replicar headers |
| API mudar sem aviso | Baixa | Monitorar erros; ter fallback para último preço em cache |
| Bloqueio por excesso de requisições | Baixa | Cache agressivo, debounce, rate limit interno |
| Preço desatualizado vs. etiqueta | Média | Avisar que é estimativa; permitir ajuste manual |
| Produtos a granel (kg) | Alta | Tratar `is_bulk` e permitir entrada de peso |
| Termos de uso do site | Média | Uso pessoal, sem redistribuição — reduz risco |

---

## 10. Próximos Passos (ordem de execução)

### Fase 1 — Validação (hoje)
1. **Testar a API via Console do site** (Opção 2 do guia anterior). Confirmar que o `*` funciona e ver o formato exato de retorno.
2. Se falhar, capturar novamente o **Payload completo** (aba "Conteúdo" no DevTools) e a **URL exata**.
3. Documentar se precisa de cookie/token.

### Fase 2 — Protótipo CLI (1-2 dias)
4. Script Node.js que busca um termo e imprime os resultados formatados.
5. Script que simula um carrinho (adiciona, soma, mostra total).

### Fase 3 — Backend (2-3 dias)
6. Servidor Express com endpoints:
   - `GET /api/buscar?q=termo&loja=express`
   - `GET /api/produto/:ean`
7. Cache em memória (TTL 10 min).

### Fase 4 — PWA (3-5 dias)
8. Interface mobile-first com busca + carrinho.
9. Persistência local.
10. Instalável no celular (manifest + service worker).

### Fase 5 — Refinamentos
11. Autocomplete integrado.
12. Agrupamento por corredor.
13. Histórico de compras.

---

## 11. Decisões Pendentes (precisam da sua resposta)

1. **Loja fixa:** qual `market_id` usar como padrão? (sugestão: `14ae828b-...` do Mateus Mais Express)
2. **Backend próprio ou PWA chamando direto?** (recomendo backend, mas MVP pode ser direto)
3. **Stack preferida?** (Node, Python, outro?)
4. **Vai usar em qual(is) loja(s) física(s)?** (define IDs)
5. **Precisa de login/sync entre dispositivos?** (se sim, muda a arquitetura)
6. **Aceita entrar peso manual para itens a granel?** (sim/não)

---

## 12. Glossário

- **EAN:** código de barras (13 dígitos), identificador único global do produto
- **SKU:** código interno da loja para o produto
- **Meilisearch:** motor de busca open-source usado pela plataforma
- **PWA:** Progressive Web App — site que se comporta como app nativo
- **Facet:** filtro/agrupamento de busca (ex: por marca)
- **Hits:** resultados retornados por uma busca

---

**Autor:** Sessão de engenharia reversa assistida
**Status:** Aguardando validação da API para prosseguir à Fase 2

---

Quando você validar a API (Fase 1), me manda o resultado e a gente avança pro protótipo. Quer que eu já prepare o **script de validação** pronto pra colar no Console do site?