// src/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { Doughnut, Line } from 'react-chartjs-2';
import 'chart.js/auto';
import './Dashboard.css';
import { initialData, simulateUpdate } from './mockData';

// Threshold definitions
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

// helper to pick appropriate condition/action
function evaluateThreshold(param, value) {
  const rules = thresholds[param] || [];
  for (let r of rules) if (r.check(value)) return { condition: r.condition, action: r.action };
  return { condition: 'Normal', action: '-' };
}

export default function Dashboard() {
  const [data, setData] = useState(initialData);
  const [history, setHistory] = useState({
    temperature: [],
    airHumidity: [],
    soilMoisture: [],
    lightIntensity: []
  });

  useEffect(() => {
    const interval = setInterval(() => {
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
    return () => clearInterval(interval);
  }, []);

  const renderDonutCard = (title, used, total, unit, key) => {
    const now = new Date(), hr = now.getHours();
    const isNight = hr < 6 || hr >= 18;
    const { condition, action } = evaluateThreshold(key, used);
    // hide light alert at night when redup
    const showAlert = !(key === 'lightIntensity' && isNight && condition === 'Redup');

    const chartData = {
      datasets: [{
        data: [used, Math.max(0, total - used)],
        backgroundColor: ['#007bff', '#e9ecef'],
        borderWidth: 0
      }]
    };
    const chartOpts = {
      cutout: '70%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    };

    return (
      <Card className="smart-card shadow-sm">
        <Card.Header>{title}</Card.Header>
        <Card.Body>
          <Doughnut data={chartData} options={chartOpts} />
          <div className="mt-2">{used} {unit}</div>
          {showAlert && (
            <div className="alert-text mt-1">
              <strong>{condition}</strong> &middot; {action}
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

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

  const renderLineChart = (title, hist, unit) => {
    const labels = hist.map(h => h.time.toLocaleTimeString());
    const dataSet = hist.map(h => h.value);
    const chartData = {
      labels,
      datasets: [{
        label: title,
        data: dataSet,
        fill: false,
        tension: 0.3,
        borderColor: '#007bff',
        pointRadius: 2
      }]
    };
    const chartOpts = {
      scales: {
        x: { display: true },
        y: { beginAtZero: true, title: { display: true, text: unit } }
      },
      plugins: { legend: { display: false } },
      maintainAspectRatio: false
    };

    return (
      <Card className="smart-card shadow-sm">
        <Card.Header>{`History: ${title}`}</Card.Header>
        <Card.Body style={{ height: '200px' }}>
          <Line data={chartData} options={chartOpts} />
        </Card.Body>
      </Card>
    );
  };

  return (
    <div className="mt-4">
      {/* real-time cards */}
      <Row>
        <Col md={6} lg={3}>
          {renderTempCard('Temperature', data.temperature)}
        </Col>
        <Col md={6} lg={3}>
          {renderDonutCard('Air Humidity', data.airHumidity, 100, '%', 'airHumidity')}
        </Col>
        <Col md={6} lg={3}>
          {renderDonutCard('Soil Moisture', data.soilMoisture, 100, '%', 'soilMoisture')}
        </Col>
        <Col md={6} lg={3}>
          {renderDonutCard('Light Intensity', data.lightIntensity, 100000, 'lux', 'lightIntensity')}
        </Col>
      </Row>

      {/* historical charts */}
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
