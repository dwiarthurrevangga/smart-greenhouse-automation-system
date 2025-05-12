// src/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { Doughnut, Line } from 'react-chartjs-2';
import Chart from 'chart.js/auto';           // Chart.js full bundle
import './Dashboard.css';
import { initialData, simulateUpdate } from './mockData';

// plugin untuk menampilkan teks di tengah donut
const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart) {
    const { ctx, width, height, config } = chart;
    const centerOpts = config.options.plugins.centerText;
    if (!centerOpts) return;

    const text = centerOpts.text;
    const font = centerOpts.font || 'bold 1.2em sans-serif';
    const color = centerOpts.color || '#000';

    ctx.save();
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textBaseline = 'middle';

    const lines = Array.isArray(text) ? text : [text];
    lines.forEach((line, i) => {
      const { width: textWidth } = ctx.measureText(line);
      const x = (width - textWidth) / 2;
      const y = (height / 2) + (i - (lines.length - 1) / 2) * 20;
      ctx.fillText(line, x, y);
    });

    ctx.restore();
  }
};
Chart.register(centerTextPlugin);

const thresholds = {
  temperature: [
    { check: v => v < 18, condition: 'Terlalu Dingin', action: 'Nyalakan pemanas' },
    { check: v => v > 32, condition: 'Terlalu Panas', action: 'Aktifkan pendingin' }
  ],
  airHumidity: [
    { check: v => v < 40, condition: 'Kering', action: 'Aktifkan humidifier' },
    { check: v => v > 80, condition: 'Lembab', action: 'Aktifkan dehumidifier' }
  ],
  soilMoisture: [
    { check: v => v < 30, condition: 'Kering', action: 'Nyalakan irigasi' },
    { check: v => v > 70, condition: 'Basah', action: 'Matikan irigasi' }
  ],
  lightIntensity: [
    { check: v => v < 20000, condition: 'Redup', action: 'Nyalakan lampu buatan' },
    { check: v => v > 40000, condition: 'Terlalu Terang', action: 'Aktifkan tirai/shading' }
  ]
};

function evaluateThreshold(param, value) {
  for (let r of (thresholds[param] || [])) {
    if (r.check(value)) return { condition: r.condition, action: r.action };
  }
  return { condition: 'Normal', action: '-' };
}

export default function Dashboard() {
  const [data, setData] = useState(initialData);
  const [history, setHistory] = useState({
    temperature: [], airHumidity: [], soilMoisture: [], lightIntensity: []
  });

  useEffect(() => {
    const id = setInterval(() => {
      setData(prev => {
        const next = simulateUpdate(prev);
        const now = new Date();
        setHistory(h => ({
          temperature:    [...h.temperature.slice(-11),    { time: now, value: next.temperature }],
          airHumidity:    [...h.airHumidity.slice(-11),    { time: now, value: next.airHumidity }],
          soilMoisture:   [...h.soilMoisture.slice(-11),   { time: now, value: next.soilMoisture }],
          lightIntensity: [...h.lightIntensity.slice(-11), { time: now, value: next.lightIntensity }]
        }));
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const renderTempCard = (title, temp) => {
    const { condition, action } = evaluateThreshold('temperature', temp);
    return (
      <Card className="smart-card smart-card--highlight shadow-sm">
        <Card.Header>{title}</Card.Header>
        <Card.Body>
          <h2 style={{ color: '#28a745', margin: 0 }}>{temp.toFixed(1)} °C</h2>
          <div className="alert-text mt-1">
            <strong>{condition}</strong> &middot; {action}
          </div>
        </Card.Body>
      </Card>
    );
  };

  const renderDonutCard = (title, used, total, unit, key) => {
    const now = new Date(), hr = now.getHours();
    const isNight = hr < 6 || hr >= 18;
    const { condition, action } = evaluateThreshold(key, used);
    const showAlert = !(key === 'lightIntensity' && isNight && condition === 'Redup');

    const dataChart = {
      datasets: [{
        data: [used, Math.max(0, total - used)],
        backgroundColor: ['#007bff', '#e9ecef'],
        borderWidth: 0
      }]
    };
    const opts = {
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        centerText: {
          text: [`${used.toFixed(1)}`, unit],
          color: '#333',
          font: 'bold 1.4em sans-serif'
        }
      }
    };

    return (
      <Card className="smart-card shadow-sm">
        <Card.Header>{title}</Card.Header>
        <Card.Body>
          <Doughnut data={dataChart} options={opts} />
          {showAlert && (
            <div className="alert-text mt-1">
              <strong>{condition}</strong> &middot; {action}
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderLineChart = (title, hist, unit) => {
    const labels = hist.map(h => h.time.toLocaleTimeString());
    const values = hist.map(h => h.value);
    return (
      <Card className="smart-card shadow-sm">
        <Card.Header>{`History: ${title}`}</Card.Header>
        <Card.Body style={{ height: '200px' }}>
          <Line
            data={{
              labels,
              datasets: [{
                label: title,
                data: values,
                fill: false,
                tension: 0.3,
                borderColor: '#007bff',
                pointRadius: 2
              }]
            }}
            options={{
              scales: {
                x: {},
                y: { beginAtZero: true, title: { display: true, text: unit } }
              },
              plugins: { legend: { display: false } },
              maintainAspectRatio: false
            }}
          />
        </Card.Body>
      </Card>
    );
  };

  return (
    <div className="mt-4">
      <h2 className="mt-5 mb-3">Informasi Greenhouse</h2>

      {/* Temperature di tengah atas */}
      <Row className="justify-content-center mb-4">
        <Col xs={12} md={6} lg={4}>
          {renderTempCard('Temperature', data.temperature)}
        </Col>
      </Row>

      {/* Tiga donut parameter */}
      <Row>
        <Col md={6} lg={4} className="mb-4">
          {renderDonutCard('Air Humidity', data.airHumidity, 100, '%', 'airHumidity')}
        </Col>
        <Col md={6} lg={4} className="mb-4">
          {renderDonutCard('Soil Moisture', data.soilMoisture, 100, '%', 'soilMoisture')}
        </Col>
        <Col md={6} lg={4} className="mb-4">
          {renderDonutCard('Light Intensity', data.lightIntensity, 100000, 'lux', 'lightIntensity')}
        </Col>
      </Row>

      <h2 className="mt-5 mb-3">Grafik Historis (1 Menit Terakhir)</h2>
      <Row>
        <Col md={6}>
          {renderLineChart('Temperature', history.temperature, '°C')}
        </Col>
        <Col md={6}>
          {renderLineChart('Air Humidity', history.airHumidity, '%')}
        </Col>
      </Row>
      <Row className="mt-4">
        <Col md={6}>
          {renderLineChart('Soil Moisture', history.soilMoisture, '%')}
        </Col>
        <Col md={6}>
          {renderLineChart('Light Intensity', history.lightIntensity, 'lux')}
        </Col>
      </Row>
    </div>
  );
}
