export function formatRp(n) {
  const num = Number(n);
  if (!isFinite(num)) return "Rp 0";
  return "Rp " + Math.round(num).toLocaleString("id-ID");
}

export function formatNumber(n, decimals = 0) {
  const num = Number(n);
  if (!isFinite(num)) return "0";
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function toRoman(num) {
  const map = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];
  let res = "";
  for (const [val, sym] of map) {
    while (num >= val) {
      res += sym;
      num -= val;
    }
  }
  return res || "I";
}

export function parseNum(v) {
  // Terima koma desimal gaya Indonesia ("2,5") bila tidak ada titik.
  if (typeof v === 'string' && v.includes(',') && !v.includes('.')) v = v.replace(',', '.');
  const n = parseFloat(v);
  return isFinite(n) && n >= 0 ? n : 0;
}

export function calcRebarWeightPerM(diameterMm) {
  const dM = diameterMm / 1000;
  return (Math.PI / 4) * dM * dM * 7850;
}

export function terbilang(n) {
  const num = Math.round(Math.abs(Number(n) || 0));
  if (num === 0) return "Nol Rupiah";

  const satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

  function bilang(x) {
    if (x < 12) {
      return " " + satuan[x];
    } else if (x < 20) {
      return bilang(x - 10) + " Belas";
    } else if (x < 100) {
      return bilang(Math.floor(x / 10)) + " Puluh" + bilang(x % 10);
    } else if (x < 200) {
      return " Seratus" + bilang(x - 100);
    } else if (x < 1000) {
      return bilang(Math.floor(x / 100)) + " Ratus" + bilang(x % 100);
    } else if (x < 2000) {
      return " Seribu" + bilang(x - 1000);
    } else if (x < 1000000) {
      return bilang(Math.floor(x / 1000)) + " Ribu" + bilang(x % 1000);
    } else if (x < 1000000000) {
      return bilang(Math.floor(x / 1000000)) + " Juta" + bilang(x % 1000000);
    } else if (x < 1000000000000) {
      return bilang(Math.floor(x / 1000000000)) + " Miliar" + bilang(x % 1000000000);
    } else if (x < 1000000000000000) {
      return bilang(Math.floor(x / 1000000000000)) + " Triliun" + bilang(x % 1000000000000);
    }
    return "";
  }

  const result = bilang(num).trim().replace(/\s+/g, " ") + " Rupiah";
  return result;
}

