// ================= ISI DATA CHANNEL THINGSPEAK KAMU =================
const CHANNEL_ID   = "3585769";   // Contoh: "2748192"
const READ_API_KEY = "T7MT8S7DF5J592C5"; // Ambil dari tab API Keys -> Read API Key
// =====================================================================

let mcChartInstance = null;
let tempChartInstance = null;
let currentFeeds = [];

async function fetchData() {
  const url = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=300`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const feeds = data.feeds;

    if (!feeds || feeds.length === 0) return;

    currentFeeds = feeds;

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

    // Siapkan data grafik (gunakan 30 data terakhir agar tetap bersih dan tidak padat)
    const chartFeeds = feeds.slice(-30);
    const labels   = chartFeeds.map(f => new Date(f.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    const arrMcIn  = chartFeeds.map(f => parseFloat(f.field1 || 0));
    const arrMcOut = chartFeeds.map(f => parseFloat(f.field2 || 0));
    const arrTIn   = chartFeeds.map(f => parseFloat(f.field6 || 0));
    const arrTOut  = chartFeeds.map(f => parseFloat(f.field8 || 0));

    renderCharts(labels, arrMcIn, arrMcOut, arrTIn, arrTOut);

    // Render tabel riwayat (mempertahankan filter tanggal yang sedang aktif)
    renderHistoryTable();
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

// Helper konversi tanggal Date object ke string format YYYY-MM-DD lokal
function formatLocalDateYMD(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Ambil data feeds yang sesuai filter tanggal
function getFilteredFeeds() {
  const filterDateInput = document.getElementById("filter-date");
  const selectedDate = filterDateInput ? filterDateInput.value : "";

  if (!selectedDate) {
    return currentFeeds;
  }

  return currentFeeds.filter(feed => {
    const feedDate = new Date(feed.created_at);
    return formatLocalDateYMD(feedDate) === selectedDate;
  });
}

// Render tabel riwayat
function renderHistoryTable() {
  const tbody = document.getElementById("history-tbody");
  const countEl = document.getElementById("record-count");
  if (!tbody) return;

  const filteredFeeds = getFilteredFeeds();
  // Urutkan dari waktu terbaru di paling atas
  const sortedFeeds = [...filteredFeeds].reverse();

  if (countEl) {
    countEl.innerText = `Menampilkan ${sortedFeeds.length} rekaman data`;
  }

  if (sortedFeeds.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty">Tidak ada data untuk tanggal ini</td></tr>`;
    return;
  }

  const rowsHtml = sortedFeeds.map(feed => {
    const dateObj = new Date(feed.created_at);
    const tglStr = dateObj.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    const jamStr = dateObj.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    const mcDlm   = parseFloat(feed.field1 || 0).toFixed(1);
    const mcLuar  = parseFloat(feed.field2 || 0).toFixed(1);
    const bDlm    = parseFloat(feed.field4 || 0).toFixed(1);
    const bLuar   = parseFloat(feed.field5 || 0).toFixed(1);
    const sDlm    = parseFloat(feed.field6 || 0).toFixed(1);
    const rhDlm   = parseFloat(feed.field7 || 0).toFixed(0);
    const sLuar   = parseFloat(feed.field8 || 0).toFixed(1);

    return `
      <tr>
        <td>${tglStr}</td>
        <td>${jamStr}</td>
        <td>${mcDlm} %</td>
        <td>${bDlm} g</td>
        <td>${mcLuar} %</td>
        <td>${bLuar} g</td>
        <td>${sDlm} °C</td>
        <td>${rhDlm} %</td>
        <td>${sLuar} °C</td>
      </tr>
    `;
  }).join("");

  tbody.innerHTML = rowsHtml;
}

// Event handler saat filter tanggal berubah
function filterDataByDate() {
  renderHistoryTable();
}

// Reset filter tanggal
function resetDateFilter() {
  const filterInput = document.getElementById("filter-date");
  if (filterInput) {
    filterInput.value = "";
  }
  renderHistoryTable();
}

// Export data yang sedang ditampilkan ke file CSV / Excel
function exportCSV() {
  const filteredFeeds = getFilteredFeeds();
  const sortedFeeds = [...filteredFeeds].reverse();

  if (sortedFeeds.length === 0) {
    alert("Tidak ada data untuk diekspor!");
    return;
  }

  const filterDateInput = document.getElementById("filter-date");
  const selectedDate = filterDateInput && filterDateInput.value ? filterDateInput.value : formatLocalDateYMD(new Date());
  const filename = `Riwayat_Kakao_${selectedDate}.csv`;

  // Header CSV berurutan
  const headers = [
    "Hari, Tanggal & Bulan",
    "Jam",
    "MC Dlm (%)",
    "Berat Dlm (g)",
    "MC Luar (%)",
    "Berat Luar (g)",
    "T. Dlm (°C)",
    "RH Dlm (%)",
    "T. Luar (°C)"
  ];

  const csvRows = [
    headers.map(h => `"${h}"`).join(",")
  ];

  sortedFeeds.forEach(feed => {
    const dateObj = new Date(feed.created_at);
    const tglStr = dateObj.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    const jamStr = dateObj.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    const mcDlm   = parseFloat(feed.field1 || 0).toFixed(1);
    const mcLuar  = parseFloat(feed.field2 || 0).toFixed(1);
    const bDlm    = parseFloat(feed.field4 || 0).toFixed(1);
    const bLuar   = parseFloat(feed.field5 || 0).toFixed(1);
    const sDlm    = parseFloat(feed.field6 || 0).toFixed(1);
    const rhDlm   = parseFloat(feed.field7 || 0).toFixed(0);
    const sLuar   = parseFloat(feed.field8 || 0).toFixed(1);

    const row = [
      `"${tglStr.replace(/"/g, '""')}"`,
      `"${jamStr}"`,
      `"${mcDlm} %"`,
      `"${bDlm} g"`,
      `"${mcLuar} %"`,
      `"${bLuar} g"`,
      `"${sDlm} °C"`,
      `"${rhDlm} %"`,
      `"${sLuar} °C"`
    ];
    csvRows.push(row.join(","));
  });

  const csvContent = csvRows.join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Jalankan pertama kali & auto-refresh tiap 20 detik
fetchData();
setInterval(fetchData, 20000);