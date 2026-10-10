import test from 'node:test';
import assert from 'node:assert/strict';
import { approximatePosition, containsPrivateContact, createFamilyMessage, isPanamaPosition, normalizeDetails, places, types } from '../core.js';

test('incluye todas las categorías obligatorias', () => {
  assert.deepEqual(Object.keys(types), ['medica', 'agua', 'alimentos', 'refugio', 'rescate', 'otra']);
});

test('normaliza texto y detecta datos de contacto obvios', () => {
  assert.equal(normalizeDetails('  Necesitamos   agua potable  '), 'Necesitamos agua potable');
  assert.equal(containsPrivateContact('Llamar al 6000 1234'), true);
  assert.equal(containsPrivateContact('correo@ejemplo.com'), true);
  assert.equal(containsPrivateContact('Necesitamos agua potable'), false);
});

test('convierte GPS a centésimas enteras y valida límites de Panamá', () => {
  const approximate = approximatePosition(8.9824, -79.5199);
  assert.deepEqual(approximate, { latE2: 898, lngE2: -7952 });
  assert.equal(isPanamaPosition(approximate), true);
  assert.equal(isPanamaPosition({ latE2: 4071, lngE2: -7401 }), false);
  assert.ok(Object.values(places).every(isPanamaPosition));
});

test('el mensaje familiar no incluye GPS salvo consentimiento', () => {
  const privateMessage = createFamilyMessage('bien', 'Chitré');
  assert.equal(privateMessage.includes('openstreetmap.org'), false);
  const sharedMessage = createFamilyMessage('bien', 'Chitré', { latE2: 796, lngE2: -8043 });
  assert.equal(sharedMessage.includes('compartida voluntariamente'), true);
  assert.equal(sharedMessage.includes('7.96'), true);
});
