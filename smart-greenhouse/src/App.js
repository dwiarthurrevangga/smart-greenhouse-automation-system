// src/App.js
import React, { useState, useEffect } from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import Dashboard from './Dashboard';
import 'bootstrap/dist/css/bootstrap.min.css';

const ACCENT = '#537D5D';

function App() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Navbar hijau dengan timestamp */}
      <Navbar expand="lg" style={{ backgroundColor: ACCENT }} variant="dark">
        <Container>
          <Navbar.Brand style={{ fontWeight: 'bold' }}>
            Smart Greenhouse
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {/* Tambahkan link jika diperlukan */}
            </Nav>
            <Navbar.Text className="text-white">
              {now.toLocaleString()}
            </Navbar.Text>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Konten Dashboard */}
      <Container fluid className="py-4 mb-5">
        <Dashboard />
      </Container>

      {/* Footer hijau */}
      <footer
        style={{
          backgroundColor: ACCENT,
          color: '#fff',
          textAlign: 'center',
          padding: '0.75rem 0',
          position: 'sticky',
          bottom: 0,
          width: '100%'
        }}
      >
        BlueCore 2025
      </footer>
    </>
  );
}

export default App;
