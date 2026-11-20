// ================= ISI DATA CHANNEL THINGSPEAK KAMU =================
const CHANNEL_ID   = "CHANNEL_ID_KAMU";   // Contoh: "2748192"
const READ_API_KEY = "READ_API_KEY_KAMU"; // Ambil dari tab API Keys -> Read API Key
// =====================================================================

let mcChartInstance = null;
let tempChartInstance = null;

async function fetchData() {
  const url = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=25`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const feeds = data.feeds;

    if (!feeds || feeds.length === 0) return;

    // Ambil data paling terakhir untuk tampilan angka real-time
    const latest = feeds[feeds.length - 1];
    const mcDalam   = parseFloat(latest.field1 || 0);
    const mcLuar    = parseFloat(latest.field2 || 0);
    const beratDlm  = parseFloat(latest.field4 || 0);
    const beratLuar = parseFloat(latest.field5 || 0);
    const suhuDlm   = parseFloat(latest.field6 || 0);
    const rhDlm     = parseFloat(latest.field7 || 0);
    const suhuLuar  = parseFloat(latest.field8 || 0);

    document.getElementById("mc-dalam").innerText    = `${mcDalam.toFixed(1)} %`;
    document.getElementById("mc-luar").innerText     = `${mcLuar.toFixed(1)} %`;
    document.getElementById("berat-dalam").innerText = `${beratDlm.toFixed(1)} g`;
    document.getElementById("berat-luar").innerText  = `${beratLuar.toFixed(1)} g`;
    document.getElementById("suhu-dalam").innerText  = `${suhuDlm.toFixed(1)} °C`;
    document.getElementById("rh-dalam").innerText    = `${rhDlm.toFixed(0)} %`;
    document.getElementById("suhu-luar").innerText   = `${suhuLuar.toFixed(1)} °C`;

    // Format waktu update terakhir (WITA / lokal HP)
    const waktu = new Date(latest.created_at).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    document.getElementById("last-update").innerText = `Update terakhir: ${waktu}`;

    // Indikator otomatis target kering SNI biji kakao (<= 7.5%)
    const badge = document.getElementById("status-badge");
    if (mcDalam > 0 && mcDalam <= 7.5) {
      badge.innerText = "Kering Standar SNI (<=7.5%)";
      badge.className = "badge badge-ok";
    } else {
      badge.innerText = "Proses Pengeringan";
      badge.className = "badge badge-warn";
    }

    // Siapkan data grafik
    const labels   = feeds.map(f => new Date(f.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    const arrMcIn  = feeds.map(f => parseFloat(f.field1 || 0));
    const arrMcOut = feeds.map(f => parseFloat(f.field2 || 0));
    const arrTIn   = feeds.map(f => parseFloat(f.field6 || 0));
    const arrTOut  = feeds.map(f => parseFloat(f.field8 || 0));

    renderCharts(labels, arrMcIn, arrMcOut, arrTIn, arrTOut);
  } catch (err) {
    document.getElementById("last-update").innerText = "Gagal memuat data (cek koneksi / API Key)";
  }
}

function renderCharts(labels, mcIn, mcOut, tIn, tOut) {
  const ctx1 = document.getElementById("mcChart").getContext("2d");
  if (mcChartInstance) mcChartInstance.destroy();
  mcChartInstance = new Chart(ctx1, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "MC Dalam (%)", data: mcIn, borderColor: "#38bdf8", tension: 0.3, fill: false },
        { label: "MC Luar (%)", data: mcOut, borderColor: "#fbbf24", tension: 0.3, fill: false }
      ]
    },
    options: { responsive: true, plugins: { legend: { labels: { color: "#cbd5e1" } } }, scales: { x: { ticks: { color: "#94a3b8" } }, y: { ticks: { color: "#94a3b8" } } } }
  });

  const ctx2 = document.getElementById("tempChart").getContext("2d");
  if (tempChartInstance) tempChartInstance.destroy();
  tempChartInstance = new Chart(ctx2, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Suhu Dalam (°C)", data: tIn, borderColor: "#f87171", tension: 0.3, fill: false },
        { label: "Suhu Luar (°C)", data: tOut, borderColor: "#34d399", tension: 0.3, fill: false }
      ]
    },
    options: { responsive: true, plugins: { legend: { labels: { color: "#cbd5e1" } } }, scales: { x: { ticks: { color: "#94a3b8" } }, y: { ticks: { color: "#94a3b8" } } } }
  });
}

// Jalankan pertama kali & auto-refresh tiap 20 detik
fetchData();
setInterval(fetchData, 20000);