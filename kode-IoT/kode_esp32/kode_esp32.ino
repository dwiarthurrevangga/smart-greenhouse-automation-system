#include <WiFi.h>
#include <FirebaseESP32.h>
#include <ESP32Servo.h>
#include <DHT.h>

// === Wi-Fi ===
#define WIFI_SSID "Freddy"
#define WIFI_PASSWORD "abangggg"

// === Firebase === (Legacy Token Style)
#define DATABASE_HOST "greenhouse-457a1-default-rtdb.asia-southeast1.firebasedatabase.app"
#define DATABASE_SECRET "YVyVImsYNhOLUxoqMUOWYHCL2szKdOZXc5SDbhDm"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// === Sensor & Aktuator ===
#define DHTPIN 21
#define DHTTYPE DHT22
#define LDR_PIN 34
#define SOIL_PIN 32

#define IN1 14  // Intake Fan
#define IN2 27
#define IN3 26  // Exhaust Fan
#define IN4 25

#define WATER_PUMP_PIN_IN1 12
#define WATER_PUMP_PIN_IN2 13

#define SERVO_PIN 23

DHT dht(DHTPIN, DHTTYPE);
Servo myServo;

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nWi-Fi Connected. IP:");
  Serial.println(WiFi.localIP());
}

void setupFirebase() {
  config.host = DATABASE_HOST;
  config.signer.tokens.legacy_token = DATABASE_SECRET;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Connecting to Firebase (legacy token)...");
  if (Firebase.ready()) {
    Serial.println("Firebase ready!");
  } else {
    Serial.println("Firebase NOT ready!");
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  delay(2000);  // Biarkan DHT22 stabil

  myServo.attach(SERVO_PIN);
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(WATER_PUMP_PIN_IN1, OUTPUT);
  pinMode(WATER_PUMP_PIN_IN2, OUTPUT);

  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
  digitalWrite(WATER_PUMP_PIN_IN1, LOW);
  digitalWrite(WATER_PUMP_PIN_IN2, LOW);
  myServo.write(0);

  connectWiFi();
  setupFirebase();
}

void loop() {
  // === Pembacaan Sensor ===
  float suhu = dht.readTemperature();
  float kelembapan_udara = dht.readHumidity();

  // Cek apakah DHT22 gagal
  if (isnan(suhu) || isnan(kelembapan_udara)) {
    Serial.println("✘ Sensor DHT22 gagal dibaca, skip loop.");
    delay(2000);
    return;
  }

  int intensitas_adc = analogRead(LDR_PIN);
  int soil_raw = analogRead(SOIL_PIN);
  float kelembapan_tanah = 100.0 - (soil_raw / 4095.0 * 100.0);
  int intensitas_lux = map(intensitas_adc, 0, 4095, 100000, 0);

  Serial.println("=== Sensor ===");
  Serial.printf("Suhu: %.2f °C\n", suhu);
  Serial.printf("Kelembapan Udara: %.2f %%\n", kelembapan_udara);
  Serial.printf("Intensitas (lux): %d\n", intensitas_lux);
  Serial.printf("Kelembapan Tanah: %.2f %%\n", kelembapan_tanah);

  // === Kirim ke Firebase ===
  if (Firebase.ready()) {
    FirebaseJson json;
    json.set("timestamp", millis());
    json.set("suhu", suhu);
    json.set("kelembapan_udara", kelembapan_udara);
    json.set("intensitas_cahaya", intensitas_lux);
    json.set("kelembapan_tanah", kelembapan_tanah);

    if (Firebase.pushJSON(fbdo, "/data_logs", json)) {
      Serial.println("✔ Data pushed to /data_logs");
    } else {
      Serial.print("✘ Push failed: ");
      Serial.println(fbdo.errorReason());
    }

    if (!Firebase.setFloat(fbdo, "/debug/last_temp", suhu)) {
      Serial.print("✘ Set debug failed: ");
      Serial.println(fbdo.errorReason());
    }
  }

  // === Logika Aktuator ===
  if (suhu > 32.0) {
    digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
    digitalWrite(IN1, LOW);  digitalWrite(IN2, LOW);
  } else if (suhu < 25.0 || kelembapan_udara < 70.0) {
    digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
    digitalWrite(IN3, LOW);  digitalWrite(IN4, LOW);
  } else {
    digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
    digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
  }

  if (kelembapan_tanah < 40.0) {
    digitalWrite(WATER_PUMP_PIN_IN1, HIGH);
    digitalWrite(WATER_PUMP_PIN_IN2, LOW);
    delay(3000);
    digitalWrite(WATER_PUMP_PIN_IN1, LOW);
    digitalWrite(WATER_PUMP_PIN_IN2, LOW);
  } else if (kelembapan_tanah > 75.0) {
    digitalWrite(WATER_PUMP_PIN_IN1, LOW);
    digitalWrite(WATER_PUMP_PIN_IN2, LOW);
  }

  if (intensitas_lux  < 20000) {
    myServo.write(45);
  } else if (intensitas_lux > 40000) {
    myServo.write(0);
  }

  delay(5000);
}