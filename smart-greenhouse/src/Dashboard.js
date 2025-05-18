// src/Dashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  Row,
  Col,
  Card,
  Form,
  Button,
  Container,
  InputGroup,
} from "react-bootstrap";
import { Doughnut, Line, Bar } from "react-chartjs-2";
import Chart from "chart.js/auto"; // Chart.js full bundle
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  format,
  subDays,
  subHours,
  differenceInMinutes,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { database } from "./firebase";
import {
  ref,
  onValue,
  query,
  limitToLast,
  orderByChild,
  get,
} from "firebase/database";
import "./Dashboard.css";
import { initialData } from "./mockData";

// 1) Plugin untuk teks di tengah donut
const centerTextPlugin = {
  id: "centerText",
  afterDraw(chart) {
    const { ctx, width, height, config } = chart;
    const centerOpts = config.options.plugins.centerText;
    if (!centerOpts) return;

    const text = centerOpts.text;
    const font = centerOpts.font || "bold 1.2em sans-serif";
    const color = centerOpts.color || "#000";

    ctx.save();
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textBaseline = "middle";

    const lines = Array.isArray(text) ? text : [text];
    lines.forEach((line, i) => {
      const { width: textWidth } = ctx.measureText(line);
      const x = (width - textWidth) / 2;
      const y = height / 2 + (i - (lines.length - 1) / 2) * 20;
      ctx.fillText(line, x, y);
    });

    ctx.restore();
  },
};
Chart.register(centerTextPlugin);

// 2) Warna tema
const ACCENT = "#9EBC8A"; // hijau
const INFO_COLOR = "#D2D0A0"; // untuk teks nilai

// 3) Threshold definitions
const thresholds = {
  temperature: [
    {
      check: (v) => v < 18,
      condition: "Terlalu Dingin",
      action: "Nyalakan pemanas",
    },
    {
      check: (v) => v > 32,
      condition: "Terlalu Panas",
      action: "Aktifkan pendingin",
    },
  ],
  airHumidity: [
    {
      check: (v) => v < 40,
      condition: "Kering",
      action: "Aktifkan humidifier",
    },
    {
      check: (v) => v > 80,
      condition: "Lembab",
      action: "Aktifkan dehumidifier",
    },
  ],
  soilMoisture: [
    { check: (v) => v < 30, condition: "Kering", action: "Nyalakan irigasi" },
    { check: (v) => v > 70, condition: "Basah", action: "Matikan irigasi" },
  ],
  lightIntensity: [
    {
      check: (v) => v < 20000,
      condition: "Redup",
      action: "Nyalakan lampu buatan",
    },
    {
      check: (v) => v > 40000,
      condition: "Terlalu Terang",
      action: "Aktifkan tirai/shading",
    },
  ],
};
function evaluateThreshold(param, value) {
  for (let r of thresholds[param] || []) {
    if (r.check(value)) return { condition: r.condition, action: r.action };
  }
  return { condition: "Normal", action: "-" };
}

export default function Dashboard() {
  const [data, setData] = useState(initialData);
  const [history, setHistory] = useState({
    temperature: [],
    airHumidity: [],
    soilMoisture: [],
    lightIntensity: [],
  });
  const [allData, setAllData] = useState([]);
  const [startDate, setStartDate] = useState(subHours(new Date(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [timeFilter, setTimeFilter] = useState("1hour");
  const [loading, setLoading] = useState(true);
  const chartsRef = useRef({});
  const [stats, setStats] = useState({
    temperature: { min: 0, max: 0, avg: 0 },
    airHumidity: { min: 0, max: 0, avg: 0 },
    soilMoisture: { min: 0, max: 0, avg: 0 },
    lightIntensity: { min: 0, max: 0, avg: 0 },
  });

  // Load data from Firebase
  useEffect(() => {
    const dataLogsRef = ref(database, "data_logs");
    const recentDataQuery = query(
      dataLogsRef,
      orderByChild("timestamp"),
      limitToLast(100)
    );

    // Listen for real-time updates
    const unsubscribe = onValue(recentDataQuery, (snapshot) => {
      if (snapshot.exists()) {
        const dataArray = [];
        snapshot.forEach((childSnapshot) => {
          const item = childSnapshot.val();
          item.id = childSnapshot.key;
          // Convert timestamp to date object
          item.date = new Date(item.timestamp);
          dataArray.push(item);
        });

        // Sort by timestamp
        dataArray.sort((a, b) => a.timestamp - b.timestamp);
        setAllData(dataArray);

        // Set current data to most recent reading
        if (dataArray.length > 0) {
          const lastReading = dataArray[dataArray.length - 1];
          setData({
            temperature: lastReading.suhu,
            airHumidity: lastReading.kelembapan_udara,
            soilMoisture: lastReading.kelembapan_tanah,
            lightIntensity: lastReading.intensitas_cahaya,
          });

          // Process history data for charts
          updateHistoryFromArray(dataArray);
        }
        setLoading(false);
      } else {
        console.log("No data available");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Update history when time filter changes
  useEffect(() => {
    const now = new Date();
    let newStartDate;

    switch (timeFilter) {
      case "1hour":
        newStartDate = subHours(now, 1);
        break;
      case "6hours":
        newStartDate = subHours(now, 6);
        break;
      case "24hours":
        newStartDate = subHours(now, 24);
        break;
      case "7days":
        newStartDate = subDays(now, 7);
        break;
      case "custom":
        newStartDate = startDate;
        break;
      default:
        newStartDate = subHours(now, 1);
    }

    setStartDate(newStartDate);
    updateHistoryFromArray(allData, newStartDate, endDate);
  }, [timeFilter, endDate, allData]);

  // Update history data when custom date range changes
  useEffect(() => {
    if (timeFilter === "custom") {
      updateHistoryFromArray(allData, startDate, endDate);
    }
  }, [startDate, endDate, timeFilter]);
  // Function to update history from data array based on time range
  const updateHistoryFromArray = (
    dataArray,
    start = startDate,
    end = endDate
  ) => {
    // Filter data by date range
    const filteredData = dataArray.filter((item) => {
      const date = new Date(item.timestamp);
      return isWithinInterval(date, { start, end });
    });

    // Calculate statistics
    if (filteredData.length > 0) {
      const calcStats = (key, dataKey) => {
        const values = filteredData.map((item) => Number(item[dataKey]) || 0);
        return {
          min: Math.min(...values).toFixed(1),
          max: Math.max(...values).toFixed(1),
          avg: (
            values.reduce((sum, val) => sum + val, 0) / values.length
          ).toFixed(1),
        };
      };

      setStats({
        temperature: calcStats("temperature", "suhu"),
        airHumidity: calcStats("airHumidity", "kelembapan_udara"),
        soilMoisture: calcStats("soilMoisture", "kelembapan_tanah"),
        lightIntensity: calcStats("lightIntensity", "intensitas_cahaya"),
      });
    }

    // Transform data for charts
    setHistory({
      temperature: filteredData.map((item) => ({
        time: new Date(item.timestamp),
        value: item.suhu,
      })),
      airHumidity: filteredData.map((item) => ({
        time: new Date(item.timestamp),
        value: item.kelembapan_udara,
      })),
      soilMoisture: filteredData.map((item) => ({
        time: new Date(item.timestamp),
        value: item.kelembapan_tanah,
      })),
      lightIntensity: filteredData.map((item) => ({
        time: new Date(item.timestamp),
        value: item.intensitas_cahaya,
      })),
    });

    // Update statistics
    setStats({
      temperature: calculateStats(filteredData, "suhu"),
      airHumidity: calculateStats(filteredData, "kelembapan_udara"),
      soilMoisture: calculateStats(filteredData, "kelembapan_tanah"),
      lightIntensity: calculateStats(filteredData, "intensitas_cahaya"),
    });
  };

  // Calculate min, max, avg for a given data array and key
  const calculateStats = (dataArray, key) => {
    const values = dataArray.map((item) => item[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length || 0;
    return { min, max, avg };
  };

  // Export data to CSV
  const exportToCSV = () => {
    if (history.temperature.length === 0) {
      alert("Tidak ada data untuk diexport");
      return;
    }

    // Combine all data by timestamp
    const exportData = history.temperature.map((item, index) => {
      return {
        timestamp: format(item.time, "yyyy-MM-dd HH:mm:ss"),
        suhu: item.value,
        kelembapan_udara: history.airHumidity[index]?.value || "",
        kelembapan_tanah: history.soilMoisture[index]?.value || "",
        intensitas_cahaya: history.lightIntensity[index]?.value || "",
      };
    });

    // Create CSV header and rows
    const header = [
      "Timestamp",
      "Suhu (°C)",
      "Kelembapan Udara (%)",
      "Kelembapan Tanah (%)",
      "Intensitas Cahaya (lux)",
    ];
    const csvRows = [
      header.join(","),
      ...exportData.map((row) =>
        [
          row.timestamp,
          row.suhu,
          row.kelembapan_udara,
          row.kelembapan_tanah,
          row.intensitas_cahaya,
        ].join(",")
      ),
    ];

    // Create blob and download
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    // Set filename based on date range
    const fileName = `greenhouse-data-${format(
      startDate,
      "yyyyMMdd"
    )}-to-${format(endDate, "yyyyMMdd")}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Kartu Temperature (highlight)
  const renderTempCard = (title, temp) => {
    const { condition, action } = evaluateThreshold("temperature", temp);
    const bgColor =
      condition === "Normal"
        ? "#8bc34a"
        : condition === "Terlalu Panas"
        ? "#ff9800"
        : "#03a9f4";

    return (
      <Card className="smart-card smart-card--highlight shadow">
        <Card.Header>{title}</Card.Header>
        <Card.Body>
          <h2 style={{ color: INFO_COLOR, margin: 0 }}>{temp.toFixed(1)} °C</h2>
          <div
            className="mt-2"
            style={{
              background: bgColor,
              color: "white",
              padding: "5px 10px",
              borderRadius: "4px",
              fontSize: "0.85rem",
            }}
          >
            <strong>{condition}</strong> &middot; {action}
          </div>
        </Card.Body>
      </Card>
    );
  };

  // Kartu donut untuk semua parameter
  const renderDonutCard = (title, used, total, unit, key) => {
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 18;
    const { condition, action } = evaluateThreshold(key, used);
    const showAlert = !(
      key === "lightIntensity" &&
      isNight &&
      condition === "Redup"
    );

    // Color configuration based on condition
    let statusColor = "#8bc34a"; // Default green for normal
    if (condition !== "Normal") {
      statusColor = key === "lightIntensity" ? "#ff9800" : "#03a9f4";
    }

    // Hitung dataChart, khusus Light Intensity pakai ratio
    let dataChart;
    if (key === "lightIntensity") {
      const minLux = 20000,
        maxLux = 40000;
      let ratio = (used - minLux) / (maxLux - minLux);
      ratio = Math.min(Math.max(ratio, 0), 1);
      dataChart = {
        datasets: [
          {
            data: [ratio, 1 - ratio],
            backgroundColor: [statusColor, "#e9ecef"],
            borderWidth: 0,
          },
        ],
      };
    } else {
      dataChart = {
        datasets: [
          {
            data: [used, Math.max(0, total - used)],
            backgroundColor: [statusColor, "#e9ecef"],
            borderWidth: 0,
          },
        ],
      };
    }

    const opts = {
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        centerText: {
          text: [`${used.toFixed(1)}`, unit],
          color: INFO_COLOR,
          font: "bold 1.4em sans-serif",
        },
      },
    };

    return (
      <Card className="smart-card shadow">
        <Card.Header>{title}</Card.Header>
        <Card.Body>
          <Doughnut data={dataChart} options={opts} />
          {showAlert && (
            <div
              className="mt-2"
              style={{
                background: statusColor,
                color: "white",
                padding: "5px 10px",
                borderRadius: "4px",
                fontSize: "0.85rem",
              }}
            >
              <strong>{condition}</strong> &middot; {action}
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  // Line chart historis - improved for real-time data
  const renderLineChart = (title, hist, unit) => {
    // Format time based on the selected time range
    const formatTime = (time) => {
      if (timeFilter === "7days") {
        return format(time, "dd MMM");
      } else if (timeFilter === "24hours" || timeFilter === "6hours") {
        return format(time, "HH:mm");
      } else {
        return format(time, "HH:mm:ss");
      }
    };

    const labels = hist.map((h) => formatTime(h.time));
    const values = hist.map((h) => h.value);

    return (
      <Card className="smart-card shadow">
        <Card.Header>{title}</Card.Header>
        <Card.Body style={{ height: "220px" }}>
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: title,
                  data: values,
                  fill: false,
                  tension: 0.3,
                  borderColor: ACCENT,
                  backgroundColor: "rgba(158, 188, 138, 0.2)",
                  borderWidth: 2,
                  pointRadius: hist.length > 20 ? 0 : 2,
                  pointHoverRadius: 5,
                },
              ],
            }}
            options={{
              responsive: true,
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
                },
                y: {
                  beginAtZero: title !== "Intensitas Cahaya",
                  title: { display: true, text: unit },
                },
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    title: (tooltipItems) => {
                      const idx = tooltipItems[0].dataIndex;
                      return hist[idx]
                        ? format(hist[idx].time, "dd MMM yyyy HH:mm:ss")
                        : "";
                    },
                  },
                },
              },
              maintainAspectRatio: false,
            }}
          />
        </Card.Body>
      </Card>
    );
  };
  return (
    <Container fluid>
      {/* Header with current status */}
      <Row className="align-items-center mb-3">
        <Col>
          <h2>Informasi Greenhouse</h2>
          {loading ? (
            <p className="text-muted">Memuat data...</p>
          ) : (
            <p className="text-muted">
              Update terakhir:{" "}
              {history.temperature.length > 0
                ? format(
                    history.temperature[history.temperature.length - 1].time,
                    "dd MMM yyyy HH:mm:ss"
                  )
                : "Tidak ada data"}
            </p>
          )}
        </Col>
      </Row>{" "}
      {/* Time filter controls */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col xs={12} md={4} className="mb-2 mb-md-0">
              <Form.Group>
                <Form.Label>
                  <strong>Filter Waktu:</strong>
                </Form.Label>
                <InputGroup>
                  <Form.Select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="shadow-sm"
                  >
                    <option value="1hour">1 Jam Terakhir</option>
                    <option value="6hours">6 Jam Terakhir</option>
                    <option value="24hours">24 Jam Terakhir</option>
                    <option value="7days">7 Hari Terakhir</option>
                    <option value="custom">Kustom</option>
                  </Form.Select>
                  <Button
                    variant="outline-success"
                    onClick={exportToCSV}
                    disabled={history.temperature.length === 0 || loading}
                    title="Export data ke CSV"
                  >
                    <i className="bi bi-download"></i>
                  </Button>
                </InputGroup>
              </Form.Group>
            </Col>

            {timeFilter === "custom" && (
              <Col xs={12} md={8}>
                <Row className="align-items-center">
                  <Col xs={5}>
                    <Form.Group>
                      <Form.Label>Tanggal Mulai:</Form.Label>
                      <DatePicker
                        selected={startDate}
                        onChange={(date) => setStartDate(date)}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        showTimeSelect
                        dateFormat="dd/MM/yyyy HH:mm"
                        className="form-control shadow-sm"
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={5}>
                    <Form.Group>
                      <Form.Label>Tanggal Akhir:</Form.Label>
                      <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        showTimeSelect
                        dateFormat="dd/MM/yyyy HH:mm"
                        className="form-control shadow-sm"
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={2}>
                    <Form.Label>&nbsp;</Form.Label>
                    <Button
                      variant="success"
                      className="w-100"
                      onClick={() =>
                        updateHistoryFromArray(allData, startDate, endDate)
                      }
                    >
                      <i className="bi bi-search"></i> Terapkan
                    </Button>
                  </Col>
                </Row>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>
      {/* Current readings section */}
      <h3 className="mb-3">Pembacaan Terkini</h3>
      {/* Temperature di tengah atas */}
      <Row className="justify-content-center mb-4">
        <Col xs={12} md={6} lg={4}>
          {renderTempCard("Suhu", data.temperature)}
        </Col>
      </Row>
      {/* Tiga donut parameter */}
      <Row>
        <Col md={6} lg={4} className="mb-4">
          {renderDonutCard(
            "Kelembapan Udara",
            data.airHumidity,
            100,
            "%",
            "airHumidity"
          )}
        </Col>
        <Col md={6} lg={4} className="mb-4">
          {renderDonutCard(
            "Kelembapan Tanah",
            data.soilMoisture,
            100,
            "%",
            "soilMoisture"
          )}
        </Col>
        <Col md={6} lg={4} className="mb-4">
          {renderDonutCard(
            "Intensitas Cahaya",
            data.lightIntensity,
            100000,
            "lux",
            "lightIntensity"
          )}
        </Col>
      </Row>
      {/* Grafik historis */}
      <h3 className="mt-5 mb-3">
        Grafik Historis
        {timeFilter === "custom"
          ? ` (${format(startDate, "dd MMM")} - ${format(endDate, "dd MMM")})`
          : timeFilter === "1hour"
          ? " (1 Jam Terakhir)"
          : timeFilter === "6hours"
          ? " (6 Jam Terakhir)"
          : timeFilter === "24hours"
          ? " (24 Jam Terakhir)"
          : " (7 Hari Terakhir)"}
      </h3>
      {history.temperature.length === 0 ? (
        <Card className="shadow-sm mb-4">
          <Card.Body className="text-center py-5">
            <h5 className="text-muted">
              Tidak ada data untuk rentang waktu yang dipilih
            </h5>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* Statistical summary */}
          <Card className="shadow mb-4">
            <Card.Header>
              <h5 className="mb-0">Ringkasan Statistik</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3} sm={6} className="mb-3 mb-md-0">
                  <h6 className="text-center">Suhu (°C)</h6>
                  <div className="d-flex justify-content-between border-bottom py-1">
                    <span className="text-muted">Min:</span>
                    <span className="fw-bold">{stats.temperature.min}</span>
                  </div>
                  <div className="d-flex justify-content-between border-bottom py-1">
                    <span className="text-muted">Rata-rata:</span>
                    <span className="fw-bold">{stats.temperature.avg}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Max:</span>
                    <span className="fw-bold">{stats.temperature.max}</span>
                  </div>
                </Col>
                <Col md={3} sm={6} className="mb-3 mb-md-0">
                  <h6 className="text-center">Kelembapan Udara (%)</h6>
                  <div className="d-flex justify-content-between border-bottom py-1">
                    <span className="text-muted">Min:</span>
                    <span className="fw-bold">{stats.airHumidity.min}</span>
                  </div>
                  <div className="d-flex justify-content-between border-bottom py-1">
                    <span className="text-muted">Rata-rata:</span>
                    <span className="fw-bold">{stats.airHumidity.avg}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Max:</span>
                    <span className="fw-bold">{stats.airHumidity.max}</span>
                  </div>
                </Col>
                <Col md={3} sm={6}>
                  <h6 className="text-center">Kelembapan Tanah (%)</h6>
                  <div className="d-flex justify-content-between border-bottom py-1">
                    <span className="text-muted">Min:</span>
                    <span className="fw-bold">{stats.soilMoisture.min}</span>
                  </div>
                  <div className="d-flex justify-content-between border-bottom py-1">
                    <span className="text-muted">Rata-rata:</span>
                    <span className="fw-bold">{stats.soilMoisture.avg}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Max:</span>
                    <span className="fw-bold">{stats.soilMoisture.max}</span>
                  </div>
                </Col>
                <Col md={3} sm={6}>
                  <h6 className="text-center">Intensitas Cahaya (lux)</h6>
                  <div className="d-flex justify-content-between border-bottom py-1">
                    <span className="text-muted">Min:</span>
                    <span className="fw-bold">{stats.lightIntensity.min}</span>
                  </div>
                  <div className="d-flex justify-content-between border-bottom py-1">
                    <span className="text-muted">Rata-rata:</span>
                    <span className="fw-bold">{stats.lightIntensity.avg}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Max:</span>
                    <span className="fw-bold">{stats.lightIntensity.max}</span>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Row>
            <Col md={6} className="mb-4">
              {renderLineChart("Suhu", history.temperature, "°C")}
            </Col>
            <Col md={6} className="mb-4">
              {renderLineChart("Kelembapan Udara", history.airHumidity, "%")}
            </Col>
          </Row>
          <Row className="mb-4">
            <Col md={6} className="mb-4 mb-md-0">
              {renderLineChart("Kelembapan Tanah", history.soilMoisture, "%")}
            </Col>
            <Col md={6}>
              {renderLineChart(
                "Intensitas Cahaya",
                history.lightIntensity,
                "lux"
              )}
            </Col>
          </Row>
        </>
      )}
      {/* Statistik Ringkas */}
      <h3 className="mt-5 mb-3">Statistik Ringkas</h3>
      <Row>
        <Col md={6} lg={3} className="mb-4">
          <Card className="smart-card shadow">
            <Card.Header>Suhu</Card.Header>
            <Card.Body>
              <h2 className="mb-0" style={{ color: INFO_COLOR }}>
                {stats.temperature.avg.toFixed(1)} °C
              </h2>
              <div className="mt-2">
                <small className="text-muted">
                  Min: {stats.temperature.min} °C
                </small>
                <br />
                <small className="text-muted">
                  Max: {stats.temperature.max} °C
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={3} className="mb-4">
          <Card className="smart-card shadow">
            <Card.Header>Kelembapan Udara</Card.Header>
            <Card.Body>
              <h2 className="mb-0" style={{ color: INFO_COLOR }}>
                {stats.airHumidity.avg.toFixed(1)}%
              </h2>
              <div className="mt-2">
                <small className="text-muted">
                  Min: {stats.airHumidity.min}%
                </small>
                <br />
                <small className="text-muted">
                  Max: {stats.airHumidity.max}%
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={3} className="mb-4">
          <Card className="smart-card shadow">
            <Card.Header>Kelembapan Tanah</Card.Header>
            <Card.Body>
              <h2 className="mb-0" style={{ color: INFO_COLOR }}>
                {stats.soilMoisture.avg.toFixed(1)}%
              </h2>
              <div className="mt-2">
                <small className="text-muted">
                  Min: {stats.soilMoisture.min}%
                </small>
                <br />
                <small className="text-muted">
                  Max: {stats.soilMoisture.max}%
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={3} className="mb-4">
          <Card className="smart-card shadow">
            <Card.Header>Intensitas Cahaya</Card.Header>
            <Card.Body>
              <h2 className="mb-0" style={{ color: INFO_COLOR }}>
                {stats.lightIntensity.avg.toFixed(1)} lux
              </h2>
              <div className="mt-2">
                <small className="text-muted">
                  Min: {stats.lightIntensity.min} lux
                </small>
                <br />
                <small className="text-muted">
                  Max: {stats.lightIntensity.max} lux
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
