// src/App.js
import React, { useState, useEffect } from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import Dashboard from './Dashboard';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  // state untuk menyimpan waktu sekarang
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // update setiap 1 detik
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Navbar */}
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand href="#">Smart Greenhouse</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {/* nanti bisa ditambah link jika perlu */}
            </Nav>
            <Navbar.Text className="text-white">
              Last update: {now.toLocaleString()}
            </Navbar.Text>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Konten Dashboard */}
      <Container fluid className="py-4">
        <Dashboard />
      </Container>
    </>
  );
}

export default App;
