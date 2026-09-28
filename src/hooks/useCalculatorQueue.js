import { useBoQ } from '../context/BoQContext';

// Poin 1: hook bersama untuk pola yang berulang di semua kalkulator raksasa:
// persistent form state + kirim hasil ke antrian BoQ + cluster multiplier.
// Kalkulator individual tinggal pakai hook ini, bukan copy-paste 50+ baris.
export function useCalculatorQueue() {
  const { queueCalculatedItems, showToast, setActiveTab, clusterUnits, updateClusterUnits, clusterTypology, clusterRowUnits } = useBoQ();
  return { queueCalculatedItems, showToast, setActiveTab, clusterUnits, updateClusterUnits, clusterTypology, clusterRowUnits };
}

// Helper murni agar logika hitung bisa di-test tanpa React.
// Contoh: volumeTrapesium(panjang, lebarAtas, lebarBawah, tinggi)
export function volumeTrapesium(panjang, lebarAtas, lebarBawah, tinggi) {
  const nums = [panjang, lebarAtas, lebarBawah, tinggi].map(Number);
  if (nums.some((n) => !isFinite(n) || n < 0)) return 0;
  return nums[0] * ((nums[1] + nums[2]) / 2) * nums[3];
}

export function applyClusterMultiplier(baseQty, units, mode = 'multiplied') {
  if (mode !== 'multiplied') return baseQty;
  return baseQty * (Math.max(1, Number(units) || 1));
}
