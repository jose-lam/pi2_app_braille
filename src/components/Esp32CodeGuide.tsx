import React, { useState } from 'react';
import { Terminal, Copy, Check, Cpu, BookOpen, Code2 } from 'lucide-react';

interface Esp32CodeGuideProps {
  token: string;
}

export const Esp32CodeGuide: React.FC<Esp32CodeGuideProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<'arduino' | 'curl' | 'setup'>('arduino');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const arduinoCode = `/*
 * PROTOTIPO SISTEMA DE LECTURA BRAILLE - FIRMWARE ESP32
 * Conexión WiFi + Cliente HTTP con autenticación X-ESP32-Token
 * Control de Celda de 6 LEDs Braille y 3 Pulsadores Físicos
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Instalar biblioteca ArduinoJson v6/v7

// 1. Configuración de Red WiFi y Servidor
const char* ssid     = "TU_RED_WIFI";
const char* password = "TU_PASSWORD_WIFI";
const char* serverUrl = "http://192.168.1.50:3000"; // IP de tu servidor backend
const char* secretToken = "${token || 'MI_TOKEN_SECRETO_123'}";

// 2. Definición de Pines para los 6 LEDs Braille
// Distribución de la celda Braille:
// [P1] [P4]   ->   GPIO 13   GPIO 27
// [P2] [P5]   ->   GPIO 12   GPIO 26
// [P3] [P6]   ->   GPIO 14   GPIO 25
const int PIN_P1 = 13;
const int PIN_P2 = 12;
const int PIN_P3 = 14;
const int PIN_P4 = 27;
const int PIN_P5 = 26;
const int PIN_P6 = 25;
const int BRAILLE_PINS[6] = {PIN_P1, PIN_P2, PIN_P3, PIN_P4, PIN_P5, PIN_P6};

// 3. Definición de Pines para los 3 Pulsadores Físicos (con INPUT_PULLUP)
const int BTN_INICIO    = 32; // Botón "Ir al Inicio"
const int BTN_ANTERIOR  = 33; // Botón "Anterior Letra"
const int BTN_SIGUIENTE = 35; // Botón "Siguiente Letra"

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Configurar pines de LEDs como salida
  for (int i = 0; i < 6; i++) {
    pinMode(BRAILLE_PINS[i], OUTPUT);
    digitalWrite(BRAILLE_PINS[i], LOW);
  }

  // Configurar botones como entrada con pullup interno
  pinMode(BTN_INICIO, INPUT_PULLUP);
  pinMode(BTN_ANTERIOR, INPUT_PULLUP);
  pinMode(BTN_SIGUIENTE, INPUT_PULLUP);

  // Conectar a red WiFi
  Serial.print("Conectando a WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi conectado exitosamente!");
  Serial.print("Dirección IP del ESP32: ");
  Serial.println(WiFi.localIP());

  // Solicitar carácter de inicio al arrancar
  solicitarEndpoint("/api/braille/inicio");
}

void loop() {
  // Detección con debounce de los 3 pulsadores físicos
  if (digitalRead(BTN_INICIO) == LOW) {
    Serial.println("Pulsador: Ir al Inicio");
    solicitarEndpoint("/api/braille/inicio");
    delay(350); // Debounce
  } else if (digitalRead(BTN_SIGUIENTE) == LOW) {
    Serial.println("Pulsador: Siguiente Letra");
    solicitarEndpoint("/api/braille/siguiente");
    delay(300); // Debounce
  } else if (digitalRead(BTN_ANTERIOR) == LOW) {
    Serial.println("Pulsador: Anterior Letra");
    solicitarEndpoint("/api/braille/anterior");
    delay(300); // Debounce
  }
}

// Función para consultar los endpoints del backend Express
void solicitarEndpoint(const char* ruta) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Error: WiFi desconectado");
    return;
  }

  HTTPClient http;
  String fullUrl = String(serverUrl) + String(ruta);
  http.begin(fullUrl);

  // Requisito: Encabezado obligatorio de seguridad X-ESP32-Token
  http.addHeader("X-ESP32-Token", secretToken);

  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("Respuesta Servidor: " + payload);

    // Parsear JSON con ArduinoJson
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      const char* caracter = doc["char"];
      int posicion = doc["position"];
      JsonArray brailleArr = doc["braille"];

      Serial.printf("Letra: '%s' | Posición: %d\\n", caracter, posicion);

      // Actualizar los 6 LEDs Braille según los booleanos
      for (int i = 0; i < 6; i++) {
        bool ledState = brailleArr[i];
        digitalWrite(BRAILLE_PINS[i], ledState ? HIGH : LOW);
      }
    } else {
      Serial.println("Error al deserializar JSON");
    }
  } else {
    Serial.printf("Error en petición HTTP: %d\\n", httpCode);
  }

  http.end();
}`;

  const curlCode = `# 1. Obtener la letra inicial (posicion_actual = posicion_inicial)
curl -X GET http://localhost:3000/api/braille/inicio \\
  -H "X-ESP32-Token: ${token || 'MI_TOKEN_SECRETO_123'}"

# 2. Avanzar a la siguiente letra (posicion_actual + 1)
curl -X GET http://localhost:3000/api/braille/siguiente \\
  -H "X-ESP32-Token: ${token || 'MI_TOKEN_SECRETO_123'}"

# 3. Retroceder a la letra anterior (posicion_actual - 1)
curl -X GET http://localhost:3000/api/braille/anterior \\
  -H "X-ESP32-Token: ${token || 'MI_TOKEN_SECRETO_123'}"

# 4. Subir un archivo .txt con la posición inicial fijada en 5
curl -X POST http://localhost:3000/api/upload \\
  -H "X-ESP32-Token: ${token || 'MI_TOKEN_SECRETO_123'}" \\
  -F "file=@mi_documento.txt" \\
  -F "posicion_inicial=5"

# 5. Prueba de seguridad (Rechazo 401 Unauthorized sin token):
curl -X GET http://localhost:3000/api/braille/siguiente`;

  const setupCode = `# ============================================================
# INSTRUCCIONES PARA EJECUTAR EL PROYECTO LOCALMENTE
# ============================================================

# 1. Clonar o descargar el repositorio
cd lector-braille-esp32

# 2. Instalar dependencias de Node.js
npm install

# 3. Configurar variables de entorno (Opcional, tiene valores por defecto)
# Crea un archivo .env si deseas personalizar el token o puerto:
# ESP32_SECRET_TOKEN=MI_TOKEN_SECRETO_123
# ALLOWED_IP=192.168.1.150

# 4. Iniciar el servidor en modo desarrollo (Backend Express + Frontend Vite)
npm run dev

# El servidor estará activo en:
# http://localhost:3000 (Accesible también desde tu ESP32 en tu red local)

# 5. Para compilar y ejecutar en producción:
npm run build
npm start`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Barra de pestañas */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3 gap-2">
        <div className="flex items-center space-x-2">
          <Code2 className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800">
            Documentación y Código Fuente para Hardware Físico
          </h3>
        </div>

        <div className="flex items-center space-x-1 bg-slate-200/70 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setActiveTab('arduino')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'arduino'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-500" />
            <span>ESP32 Arduino (.ino)</span>
          </button>
          <button
            onClick={() => setActiveTab('curl')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'curl'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-500" />
            <span>Comandos cURL</span>
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'setup'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
            <span>Guía Local</span>
          </button>
        </div>
      </div>

      {/* Contenido según pestaña activa */}
      <div className="p-5">
        {activeTab === 'arduino' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-mono">
                Firmware completo en C++ para cargar con Arduino IDE o PlatformIO en ESP32:
              </span>
              <button
                onClick={() => copyToClipboard(arduinoCode, 'arduino')}
                className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {copiedKey === 'arduino' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Sketch</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[380px] border border-slate-800">
              <code>{arduinoCode}</code>
            </pre>
          </div>
        )}

        {activeTab === 'curl' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-mono">
                Ejemplos de peticiones a la API REST con header X-ESP32-Token:
              </span>
              <button
                onClick={() => copyToClipboard(curlCode, 'curl')}
                className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {copiedKey === 'curl' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Comandos</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[380px] border border-slate-800">
              <code>{curlCode}</code>
            </pre>
          </div>
        )}

        {activeTab === 'setup' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-mono">
                Paso a paso para levantar el entorno Node.js Express local:
              </span>
              <button
                onClick={() => copyToClipboard(setupCode, 'setup')}
                className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {copiedKey === 'setup' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Guía</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[380px] border border-slate-800">
              <code>{setupCode}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
