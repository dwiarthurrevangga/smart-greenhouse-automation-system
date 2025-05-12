// src/mockData.js
export const initialData = {
  temperature: 25,       // °C
  airHumidity: 60,       // %
  soilMoisture: 40,      // %
  lightIntensity: 40000    // lux
};

/**
 * Fungsi untuk mengacak sedikit nilai (±10% dari nilai sekarang)
 */
export function simulateUpdate(oldData) {
  const jitter = (val) => {
    const change = val * 0.1;  // max ±10%
    return Math.round((val + (Math.random() * 2 - 1) * change) * 10) / 10;
  };
  return {
    temperature: jitter(oldData.temperature),
    airHumidity: jitter(oldData.airHumidity),
    soilMoisture: jitter(oldData.soilMoisture),
    lightIntensity: jitter(oldData.lightIntensity),
  };
}
