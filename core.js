// Lógica pura compartida por la interfaz y las pruebas automatizadas.
// Las coordenadas son centros aproximados de localidad, no centros de ayuda.
export const places = Object.freeze({
  chitre: { name: 'Chitré, Herrera', latE2: 796, lngE2: -8043 },
  lastablas: { name: 'Las Tablas, Los Santos', latE2: 777, lngE2: -8028 },
  santiago: { name: 'Santiago, Veraguas', latE2: 810, lngE2: -8098 },
  aguadulce: { name: 'Aguadulce, Coclé', latE2: 824, lngE2: -8055 },
  penonome: { name: 'Penonomé, Coclé', latE2: 852, lngE2: -8036 },
  panama: { name: 'Ciudad de Panamá, Panamá', latE2: 898, lngE2: -7952 },
  arraijan: { name: 'Arraiján, Panamá Oeste', latE2: 895, lngE2: -7965 },
  chorrera: { name: 'La Chorrera, Panamá Oeste', latE2: 888, lngE2: -7978 },
  colon: { name: 'Colón, Colón', latE2: 935, lngE2: -7990 },
  david: { name: 'David, Chiriquí', latE2: 843, lngE2: -8243 },
  boquete: { name: 'Boquete, Chiriquí', latE2: 878, lngE2: -8243 },
  bocas: { name: 'Bocas del Toro, Bocas del Toro', latE2: 934, lngE2: -8225 },
  changuinola: { name: 'Changuinola, Bocas del Toro', latE2: 943, lngE2: -8252 },
  lapalma: { name: 'La Palma, Darién', latE2: 840, lngE2: -7815 },
});

export const types = Object.freeze({
  medica: { label: 'Asistencia médica', tone: 'red' },
  agua: { label: 'Agua', tone: 'amber' },
  alimentos: { label: 'Alimentos', tone: 'amber' },
  refugio: { label: 'Refugio', tone: 'amber' },
  rescate: { label: 'Rescate / auxilio', tone: 'red' },
  otra: { label: 'Otra necesidad', tone: 'blue' },
});

export function normalizeDetails(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function containsPrivateContact(value) {
  return /(?:https?:\/\/|www\.|\S+@\S+|\d[\d\s()+-]{7,}\d)/i.test(value);
}

export function approximatePosition(latitude, longitude) {
  return { latE2: Math.round(latitude * 100), lngE2: Math.round(longitude * 100) };
}

export function isPanamaPosition({ latE2, lngE2 }) {
  return Number.isInteger(latE2) && Number.isInteger(lngE2)
    && latE2 >= 700 && latE2 <= 1000 && lngE2 >= -8350 && lngE2 <= -7700;
}

export function createFamilyMessage(status, area = '', position = null) {
  const base = {
    bien: 'Hola, quiero avisarte que estoy bien. Te escribo para que no te preocupes.',
    ayuda: 'Hola, necesito que me contactes cuando puedas. Por favor, respondeme este mensaje.',
    seguro: 'Hola, estoy en un lugar seguro. Quería avisarte para que estés tranquilo/a.',
  }[status] ?? 'Hola, quiero avisarte cómo estoy.';
  const cleanArea = String(area).trim().replace(/\s+/g, ' ').slice(0, 60);
  const areaPart = cleanArea ? ` Estoy por la zona de ${cleanArea}.` : '';
  const locationPart = position && isPanamaPosition(position)
    ? ` Ubicación aproximada compartida voluntariamente: https://www.openstreetmap.org/?mlat=${(position.latE2 / 100).toFixed(2)}&mlon=${(position.lngE2 / 100).toFixed(2)}#map=12/${(position.latE2 / 100).toFixed(2)}/${(position.lngE2 / 100).toFixed(2)}`
    : '';
  return base + areaPart + locationPart;
}
