const assert = require('node:assert/strict');
const { test } = require('node:test');

const fetchOriginal = global.fetch;
let chamadasDuranteImportacao = 0;
global.fetch = async () => {
  chamadasDuranteImportacao += 1;
  return { ok: true, json: async () => ({ results: [] }) };
};
const { buscar } = require('./mateus.js');
global.fetch = fetchOriginal;

test('importar o módulo não inicia uma consulta de rede', () => {
  assert.equal(chamadasDuranteImportacao, 0);
});

test('preço sem oferta não é classificado como promoção', async () => {
  const fetchAnterior = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      results: [{ hits: [
        { barcode: '1', name: 'Preço regular', price: 20, sale_price: null },
        { barcode: '2', name: 'Em promoção', price: 20, sale_price: 18 },
      ] }],
    }),
  });

  try {
    const produtos = await buscar('arroz');
    assert.equal(produtos[0].preco, 20);
    assert.equal(produtos[0].emPromocao, false);
    assert.equal(produtos[0].desconto, 0);
    assert.equal(produtos[1].preco, 18);
    assert.equal(produtos[1].emPromocao, true);
    assert.equal(produtos[1].desconto, 10);
  } finally {
    global.fetch = fetchAnterior;
  }
});

test('rejeita termo vazio e loja desconhecida antes de acessar a rede', async () => {
  await assert.rejects(buscar('  '), /termo de busca/);
  await assert.rejects(buscar('arroz', 'desconhecida'), /Loja desconhecida/);
});