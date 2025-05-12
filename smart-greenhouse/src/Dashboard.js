// src/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Doughnut } from 'react-chartjs-2';
import './Dashboard.css';
import { initialData, simulateUpdate } from './mockData';

export default function Dashboard() {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    const id = setInterval(() => setData(d => simulateUpdate(d)), 5000);
    return () => clearInterval(id);
  }, []);

  // Donut untuk semua selain temperature
  const renderDonutCard = (title, used, total, unit) => {
    const chartData = {
      datasets: [{
        data: [used, total - used],
        backgroundColor: ['#007bff', '#e9ecef'],
        borderWidth: 0
      }]
    };
    const chartOpts = {
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    };
    return (
      <Card className="smart-card shadow-sm">
        <Card.Header>{title}</Card.Header>
        <Card.Body>
          <Doughnut data={chartData} options={chartOpts} />
          <div className="mt-2">{`${used} ${unit}`}</div>
        </Card.Body>
      </Card>
    );
  };

  // Card khusus untuk temperature, dengan highlight
  const renderTempCard = (title, temp) => (
    <Card className="smart-card smart-card--highlight shadow-sm">
      <Card.Header>{title}</Card.Header>
      <Card.Body>
        <h2 style={{ color: '#28a745', margin: 0 }}>
          {temp.toFixed(1)} °C
        </h2>
      </Card.Body>
    </Card>
  );

  return (
    <Container fluid className="py-4">
      <h1 className="mb-4 text-center">Smart Greenhouse Automation System</h1>
      <Row>
        <Col md={6} lg={3}>
          {renderTempCard('Temperature', data.temperature)}
        </Col>
        <Col md={6} lg={3}>
          {renderDonutCard('Air Humidity', data.airHumidity, 100, '%')}
        </Col>
        <Col md={6} lg={3}>
          {renderDonutCard('Soil Moisture', data.soilMoisture, 100, '%')}
        </Col>
        <Col md={6} lg={3}>
          {renderDonutCard('Light Intensity', data.lightIntensity, 1000, 'lux')}
        </Col>
      </Row>
    </Container>
  );
}
