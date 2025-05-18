// src/App.js
import React, { useState, useEffect } from "react";
import { Container, Navbar, Nav } from "react-bootstrap";
import Dashboard from "./Dashboard";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const ACCENT = "#537D5D";

function App() {
  const [now, setNow] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Navbar hijau dengan timestamp */}
      <Navbar
        expand="lg"
        style={{ backgroundColor: ACCENT }}
        variant="dark"
        className="shadow"
      >
        <Container>
          <Navbar.Brand style={{ fontWeight: "bold" }}>
            <i className="bi bi-flower1 me-2"></i>
            Smart Greenhouse
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link href="#dashboard" className="text-white">
                Dashboard
              </Nav.Link>
              <Nav.Link href="#settings" className="text-white">
                Settings
              </Nav.Link>
              <Nav.Link href="#help" className="text-white">
                Help
              </Nav.Link>
            </Nav>
            <div className="d-flex align-items-center">
              <div
                className={`me-3 ${
                  isConnected ? "text-success" : "text-danger"
                }`}
              >
                <i
                  className={`bi bi-circle-fill me-1`}
                  style={{ fontSize: "0.5rem" }}
                ></i>
                <span className="text-white">
                  {isConnected ? "Online" : "Offline"}
                </span>
              </div>
              <Navbar.Text className="text-white">
                <i className="bi bi-clock me-1"></i>
                {now.toLocaleString()}
              </Navbar.Text>
            </div>
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
          color: "#fff",
          textAlign: "center",
          padding: "0.75rem 0",
          position: "sticky",
          bottom: 0,
          width: "100%",
        }}
        className="shadow-lg"
      >
        <Container>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <i className="bi bi-flower1 me-1"></i> Smart Greenhouse © 2025
            </div>
            <div>
              <span>BlueCore 2025</span>
              <a
                href="https://github.com"
                className="text-white ms-3"
                target="_blank"
                rel="noreferrer"
              >
                <i className="bi bi-github"></i>
              </a>
            </div>
          </div>
        </Container>
      </footer>
    </>
  );
}

export default App;
