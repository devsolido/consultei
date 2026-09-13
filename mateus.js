// mateus.js
const ENDPOINT = 'https://app.mateusmais.com.br/api/products/internal/v1/service/*/queries';
const INDEX = 'SHOWCASE_catalog_product_api_index_PROD';

const LOJAS = {
  express: '14ae828b-491f-42fc-8247-5089f6613750',
  cohama:  '2857c51e-ffc9-4365-b39a-0156cfc032b9',
  food:    'f7a3a08f-12bf-4507-ae1b-81d8c02790cf',
};

async function buscar(termo, loja = 'express', limite = 20) {
  const marketId = LOJAS[loja];
  if (!marketId) throw new Error(`Loja desconhecida: ${loja}`);

  const params = new URLSearchParams({
    hitsPerPage: String(limite),
    clickAnalytics: 'true',
    facetFilters: JSON.stringify([
      [`market_id:${marketId}`],
      ['for_sale:true'],
    ]),
    facets: JSON.stringify(['brand', 'nodes']),
    query: termo,
  }).toString();

  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://mateusmais.com.br',
      'Referer': 'https://mateusmais.com.br/',
    },
    body: JSON.stringify({
      requests: [{ title: loja, params, indexName: INDEX }],
      service: 'meilisearch',
    }),
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();

  return data.results.flatMap(g =>
    (g.hits || []).map(p => ({
      ean: p.barcode,
      nome: p.name,
      marca: p.brand,
      categoria: p.departament_name,
      preco: p.sale_price ?? p.price,
      precoCheio: p.price,
      emPromocao: p.sale_price < p.price,
      desconto: p.sale_price < p.price
        ? Math.round((1 - p.sale_price / p.price) * 100)
        : 0,
      estoque: p.amount_in_stock,
      unidade: `${p.measure} ${p.measure_type}`,
      local: p.physical_location?.trim() || null,
      imagem: p.small_image,
      market_name: p.market_name,
    }))
  );
}

// Teste rápido
(async () => {
  console.log('🔎 Buscando "nescau"...\n');
  const produtos = await buscar('nescau', 'express');
  produtos.slice(0, 5).forEach((p, i) => {
    const promo = p.emPromocao ? ` 🔥 -${p.desconto}%` : '';
    console.log(`${i + 1}. ${p.nome}${promo}`);
    console.log(`   R$ ${p.preco.toFixed(2)} | ${p.unidade} | estoque: ${p.estoque}`);
    console.log(`   📍 ${p.local || 'sem local'}\n`);
  });
})();