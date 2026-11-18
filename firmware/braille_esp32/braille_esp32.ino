#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>

// ============================================================================
// 1. CONFIGURACIÓN DE HARDWARE Y PINES (MANTENIDO DEL PROTOTIPO)
// ============================================================================
const uint8_t PIN_BTN_INICIO    = 15;
const uint8_t PIN_BTN_SIGUIENTE = 2;
const uint8_t PIN_BTN_ANTERIOR  = 0;

// 5 Solenoides / LEDs físicos conectados: [P1_SupIzq, P2_MedIzq, P3_InfIzq, P4_SupDer, P5_MedDer]
// El backend envía 6 booleanos [P1..P6]; P1..P5 controlan los pines físicos y P6 queda listo para extensión.
const uint8_t ACTUATOR_PINS[5] = {23, 33, 26, 32, 25};

// Cambiar a true e indicar el GPIO si se conecta el 6to solenoide (P6_InfDer)
#define HAS_SIXTH_ACTUATOR false
const uint8_t PIN_ACTUATOR_P6 = 27;

// ============================================================================
// 2. MEMORIA FLASH (Preferences) Y PORTAL CAUTIVO
// ============================================================================
Preferences preferences;
const char* PREF_NAMESPACE = "braille_cfg";
const char* AP_SSID        = "BrailleReader-Setup";

String cfgWifiSsid    = "";
String cfgWifiPass    = "";
String cfgDeviceToken = "";
String cfgServerUrl   = "";

WebServer portalServer(80);
DNSServer dnsServer;
const byte DNS_PORT = 53;
bool isPortalActive = false;

// ============================================================================
// 3. CONTROL DE BOTONES, ANTI-REBOTE Y PULSACIÓN LARGA (5s)
// ============================================================================
struct Button {
  uint8_t pin;
  bool lastState;
  bool currentState;
  unsigned long lastDebounceTime;
};

Button btnInicio    = {PIN_BTN_INICIO, HIGH, HIGH, 0};
Button btnSiguiente = {PIN_BTN_SIGUIENTE, HIGH, HIGH, 0};
Button btnAnterior  = {PIN_BTN_ANTERIOR, HIGH, HIGH, 0};

const unsigned long DEBOUNCE_DELAY_MS   = 50;
const unsigned long PORTAL_HOLD_TIME_MS = 5000;
unsigned long inicioHoldStartMs         = 0;
bool inicioHolding                      = false;

// ============================================================================
// 4. ESTADO DE SINCRONIZACIÓN Y ENDPOINTS API REST
// ============================================================================
const char* ENDPOINT_ESTADO    = "/api/braille/estado";
const char* ENDPOINT_INICIO    = "/api/braille/inicio";
const char* ENDPOINT_SIGUIENTE = "/api/braille/siguiente";
const char* ENDPOINT_ANTERIOR  = "/api/braille/anterior";

bool isSyncMode = false;
int lastRenderedPosition = -1;
String lastRenderedChar = "";
unsigned long lastSyncPollMs = 0;
const unsigned long SYNC_POLL_INTERVAL_MS = 1200;

// Declaración de funciones
void loadConfigFromFlash();
void saveConfigToFlash(const String& ssid, const String& pass, const String& token, const String& serverUrl);
bool hasValidConfig();
void startCaptivePortal();
void handlePortalRoot();
void handlePortalSave();
String htmlEscape(const String& input);
bool connectWiFi();
bool isButtonPressed(Button &btn);
void checkLongPressPortalTrigger();
void sendHTTPGetRequest(const char* endpoint, bool silentIfUnchanged);
void updateBrailleActuators(JsonArrayConst brailleArray, int position, const char* charStr);
void printMenu();

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(800);
  Serial.println("\n=== BRAILLECLOUD ESP32 CLIENTE SAAS MULTI-TENANT ===");

  pinMode(PIN_BTN_INICIO, INPUT_PULLUP);
  pinMode(PIN_BTN_SIGUIENTE, INPUT_PULLUP);
  pinMode(PIN_BTN_ANTERIOR, INPUT_PULLUP);

  for (int i = 0; i < 5; i++) {
    pinMode(ACTUATOR_PINS[i], OUTPUT);
    digitalWrite(ACTUATOR_PINS[i], LOW);
  }
  if (HAS_SIXTH_ACTUATOR) {
    pinMode(PIN_ACTUATOR_P6, OUTPUT);
    digitalWrite(PIN_ACTUATOR_P6, LOW);
  }

  // Verificar si se mantiene presionado el botón Inicio (GPIO 15) durante 5s al arrancar
  if (digitalRead(PIN_BTN_INICIO) == LOW) {
    Serial.println("[SETUP] Botón Inicio presionado al encender. Mantén 5s para abrir Portal Cautivo...");
    unsigned long startWait = millis();
    while (digitalRead(PIN_BTN_INICIO) == LOW) {
      if (millis() - startWait >= PORTAL_HOLD_TIME_MS) {
        Serial.println("[SETUP] 5 segundos alcanzados -> Iniciando Portal Cautivo.");
        startCaptivePortal();
        return;
      }
      delay(50);
    }
  }

  loadConfigFromFlash();

  if (!hasValidConfig()) {
    Serial.println("[CONFIG] Credenciales no encontradas en Flash -> Iniciando Portal Cautivo.");
    startCaptivePortal();
    return;
  }

  if (connectWiFi()) {
    sendHTTPGetRequest(ENDPOINT_INICIO, false);
    printMenu();
  }
}

// ============================================================================
// LOOP PRINCIPAL
// ============================================================================
void loop() {
  if (isPortalActive) {
    dnsServer.processNextRequest();
    portalServer.handleClient();
    return;
  }

  // Verificar si el usuario mantiene GPIO 15 durante 5 segundos en tiempo de ejecución
  checkLongPressPortalTrigger();
  if (isPortalActive) return;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Conexión perdida. Reintentando conexión al Wi-Fi del salón...");
    if (!connectWiFi()) {
      delay(2000);
    }
    return;
  }

  // Botones físicos (conectados a GND con INPUT_PULLUP)
  if (isButtonPressed(btnInicio)) {
    Serial.println("\n[BOTÓN GPIO 15] 'Inicio'");
    sendHTTPGetRequest(ENDPOINT_INICIO, false);
  }

  if (isButtonPressed(btnSiguiente)) {
    Serial.println("\n[BOTÓN GPIO 2] 'Siguiente'");
    sendHTTPGetRequest(ENDPOINT_SIGUIENTE, false);
  }

  if (isButtonPressed(btnAnterior)) {
    Serial.println("\n[BOTÓN GPIO 0] 'Anterior'");
    sendHTTPGetRequest(ENDPOINT_ANTERIOR, false);
  }

  // Sondeo automático de estado en Modo Sincronizado
  if (millis() - lastSyncPollMs >= SYNC_POLL_INTERVAL_MS) {
    lastSyncPollMs = millis();
    if (isSyncMode) {
      sendHTTPGetRequest(ENDPOINT_ESTADO, true);
    }
  }

  // Control opcional por Monitor Serial
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == '\n' || cmd == '\r') return;

    switch (cmd) {
      case '1':
        sendHTTPGetRequest(ENDPOINT_INICIO, false);
        break;
      case '2':
        sendHTTPGetRequest(ENDPOINT_SIGUIENTE, false);
        break;
      case '3':
        sendHTTPGetRequest(ENDPOINT_ANTERIOR, false);
        break;
      case '4':
        sendHTTPGetRequest(ENDPOINT_ESTADO, false);
        break;
      case '9':
        Serial.println("[SERIAL] Abriendo Portal Cautivo manualmente...");
        startCaptivePortal();
        break;
      default:
        Serial.println("[SERIAL] Comandos: 1=Inicio, 2=Siguiente, 3=Anterior, 4=Estado, 9=Portal Setup");
        break;
    }
  }
}

// ============================================================================
// MEMORIA NO VOLÁTIL (PREFERENCES / NVS)
// ============================================================================
void loadConfigFromFlash() {
  preferences.begin(PREF_NAMESPACE, true);
  cfgWifiSsid    = preferences.getString("wifi_ssid", "");
  cfgWifiPass    = preferences.getString("wifi_pass", "");
  cfgDeviceToken = preferences.getString("device_token", "");
  cfgServerUrl   = preferences.getString("server_url", "");
  preferences.end();

  cfgWifiSsid.trim();
  cfgDeviceToken.trim();
  cfgServerUrl.trim();
  while (cfgServerUrl.endsWith("/")) {
    cfgServerUrl.remove(cfgServerUrl.length() - 1);
  }
}

void saveConfigToFlash(const String& ssid, const String& pass, const String& token, const String& serverUrl) {
  String cleanUrl = serverUrl;
  cleanUrl.trim();
  while (cleanUrl.endsWith("/")) {
    cleanUrl.remove(cleanUrl.length() - 1);
  }

  preferences.begin(PREF_NAMESPACE, false);
  preferences.putString("wifi_ssid", ssid);
  preferences.putString("wifi_pass", pass);
  preferences.putString("device_token", token);
  preferences.putString("server_url", cleanUrl);
  preferences.end();

  cfgWifiSsid    = ssid;
  cfgWifiPass    = pass;
  cfgDeviceToken = token;
  cfgServerUrl   = cleanUrl;
}

bool hasValidConfig() {
  return cfgWifiSsid.length() > 0 && cfgDeviceToken.length() > 0 && cfgServerUrl.length() > 0;
}

// ============================================================================
// PORTAL CAUTIVO AP (192.168.4.1)
// ============================================================================
String htmlEscape(const String& input) {
  String out = input;
  out.replace("&", "&amp;");
  out.replace("\"", "&quot;");
  out.replace("<", "&lt;");
  out.replace(">", "&gt;");
  return out;
}

void handlePortalRoot() {
  String page = R"rawliteral(<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BrailleReader Setup</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0A0A0C; color: #F5F5F7; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .card { width: 100%; max-width: 420px; background: #121216; border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; padding: 28px; }
    h1 { margin: 0 0 6px; font-size: 20px; font-weight: 600; }
    p { margin: 0 0 20px; font-size: 13px; color: #9CA3AF; line-height: 1.4; }
    label { display: block; font-size: 12px; font-weight: 500; color: #D1D5DB; margin-bottom: 6px; }
    input { width: 100%; padding: 11px 13px; margin-bottom: 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: #0A0A0C; color: #FFFFFF; font-size: 14px; outline: none; }
    input:focus { border-color: #10B981; }
    button { width: 100%; padding: 12px; border: none; border-radius: 10px; background: #10B981; color: #052E16; font-size: 14px; font-weight: 600; cursor: pointer; }
    .hint { margin-top: 14px; font-size: 11px; color: #6B7280; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>BrailleCloud · Setup ESP32</h1>
    <p>Vincula este dispositivo al Wi-Fi del salón y a la instancia en AWS EC2.</p>
    <form method="POST" action="/save">
      <label for="ssid">Nombre de Red Wi-Fi (SSID del Salón)</label>
      <input id="ssid" name="ssid" type="text" required placeholder="Ej. Aula_Braille_WiFi" value=")rawliteral";
  page += htmlEscape(cfgWifiSsid);
  page += R"rawliteral(" />
      <label for="pass">Contraseña Wi-Fi</label>
      <input id="pass" name="pass" type="password" placeholder="Contraseña de la red" value=")rawliteral";
  page += htmlEscape(cfgWifiPass);
  page += R"rawliteral(" />
      <label for="server">URL del Servidor EC2 (sin barra final)</label>
      <input id="server" name="server" type="url" required placeholder="http://54.123.45.67" value=")rawliteral";
  page += htmlEscape(cfgServerUrl);
  page += R"rawliteral(" />
      <label for="token">Token Único del Dispositivo (X-ESP32-Token)</label>
      <input id="token" name="token" type="text" required placeholder="br_esp32_..." value=")rawliteral";
  page += htmlEscape(cfgDeviceToken);
  page += R"rawliteral(" />
      <button type="submit">Guardar y Conectar</button>
    </form>
    <div class="hint">Puerto de configuración: 192.168.4.1 · Memoria NVS Flash</div>
  </div>
</body>
</html>)rawliteral";

  portalServer.send(200, "text/html", page);
}

void handlePortalSave() {
  String ssid   = portalServer.arg("ssid");
  String pass   = portalServer.arg("pass");
  String server = portalServer.arg("server");
  String token  = portalServer.arg("token");

  ssid.trim();
  server.trim();
  token.trim();

  if (ssid.length() == 0 || server.length() == 0 || token.length() == 0) {
    portalServer.send(400, "text/plain", "Todos los campos requeridos deben completarse.");
    return;
  }

  saveConfigToFlash(ssid, pass, token, server);

  String okPage = R"rawliteral(<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{background:#0A0A0C;color:#F5F5F7;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
.box{background:#121216;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;max-width:380px;text-align:center}
h2{color:#10B981;margin-top:0}</style></head>
<body><div class="box"><h2>Configuración Guardada</h2>
<p>Los parámetros se almacenaron en memoria Flash. El ESP32 se reiniciará ahora para conectarse al salón.</p></div></body></html>)rawliteral";

  portalServer.send(200, "text/html", okPage);
  delay(1500);
  ESP.restart();
}

void startCaptivePortal() {
  loadConfigFromFlash();
  isPortalActive = true;

  // Apagar actuadores durante configuración
  for (int i = 0; i < 5; i++) {
    digitalWrite(ACTUATOR_PINS[i], LOW);
  }
  if (HAS_SIXTH_ACTUATOR) {
    digitalWrite(PIN_ACTUATOR_P6, LOW);
  }

  WiFi.disconnect(true);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID);

  IPAddress apIP = WiFi.softAPIP();
  dnsServer.start(DNS_PORT, "*", apIP);

  portalServer.on("/", HTTP_GET, handlePortalRoot);
  portalServer.on("/save", HTTP_POST, handlePortalSave);
  portalServer.onNotFound(handlePortalRoot);
  portalServer.begin();

  Serial.println("\n====================================================");
  Serial.println("[PORTAL CAUTIVO ACTIVO]");
  Serial.print("  Red Wi-Fi AP : ");
  Serial.println(AP_SSID);
  Serial.print("  URL Setup    : http://");
  Serial.println(apIP);
  Serial.println("====================================================");
}

// ============================================================================
// DETECCIÓN DE BOTONES Y PULSACIÓN LARGA DE 5 SEGUNDOS
// ============================================================================
void checkLongPressPortalTrigger() {
  if (digitalRead(PIN_BTN_INICIO) == LOW) {
    if (!inicioHolding) {
      inicioHolding = true;
      inicioHoldStartMs = millis();
    } else if (millis() - inicioHoldStartMs >= PORTAL_HOLD_TIME_MS) {
      Serial.println("\n[BOTÓN INICIO 5s] Activando Portal Cautivo...");
      startCaptivePortal();
    }
  } else {
    inicioHolding = false;
  }
}

bool isButtonPressed(Button &btn) {
  bool reading = digitalRead(btn.pin);
  bool pressed = false;

  if (reading != btn.lastState) {
    btn.lastDebounceTime = millis();
  }

  if ((millis() - btn.lastDebounceTime) > DEBOUNCE_DELAY_MS) {
    if (reading != btn.currentState) {
      btn.currentState = reading;
      if (btn.currentState == LOW) {
        pressed = true;
      }
    }
  }

  btn.lastState = reading;
  return pressed;
}

// ============================================================================
// CONEXIÓN WI-FI AL SALÓN CONFIGURADO
// ============================================================================
bool connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(cfgWifiSsid.c_str(), cfgWifiPass.c_str());

  Serial.print("[WIFI] Conectando al Wi-Fi del salón: ");
  Serial.println(cfgWifiSsid);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 24) {
    // Permitir entrar al portal cautivo si se mantiene GPIO 15 durante la espera
    checkLongPressPortalTrigger();
    if (isPortalActive) return false;
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Conectado.");
    Serial.print("[WIFI] IP asignada: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println("\n[WIFI] No se pudo conectar. Mantén botón Inicio 5s para reconfigurar.");
  return false;
}

// ============================================================================
// CLIENTE HTTP / HTTPS HACIA AWS EC2 (NGINX + FASTAPI)
// ============================================================================
void sendHTTPGetRequest(const char* endpoint, bool silentIfUnchanged) {
  String fullURL = cfgServerUrl + String(endpoint);
  bool useHttps = fullURL.startsWith("https://");

  HTTPClient http;
  WiFiClient plainClient;
  WiFiClientSecure secureClient;

  bool began = false;
  if (useHttps) {
    secureClient.setInsecure();
    began = http.begin(secureClient, fullURL);
  } else {
    began = http.begin(plainClient, fullURL);
  }

  if (!began) {
    Serial.println("[HTTP] Error al inicializar cliente HTTP.");
    return;
  }

  http.setConnectTimeout(4000);
  http.setTimeout(4000);
  http.addHeader("X-ESP32-Token", cfgDeviceToken);

  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (error) {
      Serial.print("[JSON] Error de decodificación: ");
      Serial.println(error.f_str());
    } else {
      isSyncMode = doc["syncMode"] | false;
      int position = doc["position"] | 0;
      const char* charStr = doc["char"] | "";

      bool changed = (position != lastRenderedPosition) || (String(charStr) != lastRenderedChar);
      if (!silentIfUnchanged || changed) {
        Serial.print("[BRAILLE] Char: '");
        Serial.print(charStr);
        Serial.print("' | Pos: ");
        Serial.print(position);
        Serial.print(" | Modo: ");
        Serial.println(isSyncMode ? "SINCRONIZADO" : "LIBRE");

        JsonArrayConst brailleArray = doc["braille"].as<JsonArrayConst>();
        if (!brailleArray.isNull() && brailleArray.size() == 6) {
          updateBrailleActuators(brailleArray, position, charStr);
        }
      }
    }
  } else if (!silentIfUnchanged) {
    Serial.print("[HTTP] Error ");
    Serial.print(httpCode);
    Serial.print(": ");
    if (httpCode > 0) {
      Serial.println(http.getString());
    } else {
      Serial.println(http.errorToString(httpCode));
    }
  }

  http.end();
}

void updateBrailleActuators(JsonArrayConst brailleArray, int position, const char* charStr) {
  lastRenderedPosition = position;
  lastRenderedChar = String(charStr);

  Serial.print("[ACTUADORES P1..P6]: [ ");
  for (int i = 0; i < 6; i++) {
    bool pinState = brailleArray[i].as<bool>();

    if (i < 5) {
      digitalWrite(ACTUATOR_PINS[i], pinState ? HIGH : LOW);
    } else if (HAS_SIXTH_ACTUATOR) {
      digitalWrite(PIN_ACTUATOR_P6, pinState ? HIGH : LOW);
    }

    Serial.print("P");
    Serial.print(i + 1);
    Serial.print(":");
    Serial.print(pinState ? "ON" : "OFF");
    if (i == 5 && !HAS_SIXTH_ACTUATOR) {
      Serial.print("(V)");
    }
    if (i < 5) Serial.print(" | ");
  }
  Serial.println(" ]");
}

void printMenu() {
  Serial.println("\n--- CONTROLES ESP32 ---");
  Serial.println("  [GPIO 15] / [1] -> Inicio");
  Serial.println("  [GPIO 2]  / [2] -> Siguiente");
  Serial.println("  [GPIO 0]  / [3] -> Anterior");
  Serial.println("  [4]             -> Consultar Estado");
  Serial.println("  [Mantener GPIO 15 5s] / [9] -> Portal Cautivo (192.168.4.1)");
  Serial.println("-----------------------");
}
