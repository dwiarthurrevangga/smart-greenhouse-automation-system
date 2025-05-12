// src/Dashboard.js
import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { initialData, simulateUpdate } from './mockData';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Set data awal dari mock
    setData(initialData);

    // Simulasikan update setiap 5 detik
    const intervalId = setInterval(() => {
      setData(prev => simulateUpdate(prev));
    }, 5000);

    // Cleanup interval saat unmount
    return () => clearInterval(intervalId);
  }, []);

  const renderCard = (title, value, unit) => (
    <Card className="text-center mb-4 shadow-sm">
      <Card.Body>
        <Card.Title>{title}</Card.Title>
        <Card.Text style={{ fontSize: '2rem' }}>
          {value !== null && value !== undefined
            ? `${value} ${unit}`
            : <Spinner animation="border" size="sm" />}
        </Card.Text>
      </Card.Body>
    </Card>
  );

  return (
    <Container className="py-4">
      <h1 className="mb-4 text-center">Smart Greenhouse Automation System</h1>
      <Row>
        <Col md={6} lg={3}>
          {renderCard('Suhu', data?.temperature, '°C')}
        </Col>
        <Col md={6} lg={3}>
          {renderCard('Kelembapan Udara', data?.airHumidity, '%')}
        </Col>
        <Col md={6} lg={3}>
          {renderCard('Kelembapan Tanah', data?.soilMoisture, '%')}
        </Col>
        <Col md={6} lg={3}>
          {renderCard('Intensitas Cahaya', data?.lightIntensity, 'lux')}
        </Col>
      </Row>
    </Container>
  );
}
