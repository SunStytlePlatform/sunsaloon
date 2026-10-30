import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShop, safeLogoUrl } from './normalizeShop.ts';

test('only https logo URLs are kept', () => {
  assert.equal(safeLogoUrl('https://cdn.example.com/logo.png'), 'https://cdn.example.com/logo.png');
  assert.equal(safeLogoUrl('http://cdn.example.com/logo.png'), null);
  assert.equal(safeLogoUrl('javascript:alert(1)'), null);
  assert.equal(safeLogoUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), null);
  assert.equal(safeLogoUrl('//cdn.example.com/logo.png'), null);
  assert.equal(safeLogoUrl('not a url'), null);
  assert.equal(safeLogoUrl(''), null);
  assert.equal(safeLogoUrl(null), null);
});

test('normalizeShop maps backend columns and drops an unsafe logo', () => {
  const shop = normalizeShop({ id: 5, shop_name: ' Sun Saloon ', phone: '123', logo_url: 'javascript:alert(1)', email: '  ' });
  assert.deepEqual(shop, {
    id: '5',
    name: 'Sun Saloon',
    description: null,
    address: null,
    phone: '123',
    email: null,
    logoUrl: null,
  });
});
