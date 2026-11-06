/*
 * ============================================================================
 * CÓDIGO BASE ESP32 / ESP8266 - CONTROLE REMOTO DE CARRINHO (WEBSOCKETS)
 * ============================================================================
 * Instalar a biblioteca: WebSockets por Markus Sattler (via Arduino IDE)
 * ============================================================================
 */

#include <WiFi.h>              // Para ESP32 (para ESP8266 troque por <ESP8266WiFi.h>)
#include <WebSocketsServer.h>

const char* ssid = "Carrinho_ESP";
const char* password = "12345678password";

WebSocketsServer webSocket = WebSocketsServer(81);

// Pinos da Ponte H
const int PIN_IN1 = 26; 
const int PIN_IN2 = 27; 
const int PIN_ENA = 14; 

void ajustarMotores(int velocidade) {
  if (velocidade > 0) {
    digitalWrite(PIN_IN1, HIGH);
    digitalWrite(PIN_IN2, LOW);
    analogWrite(PIN_ENA, map(velocidade, 0, 100, 0, 255));
  } else if (velocidade < 0) {
    digitalWrite(PIN_IN1, LOW);
    digitalWrite(PIN_IN2, HIGH);
    analogWrite(PIN_ENA, map(abs(velocidade), 0, 100, 0, 255));
  } else {
    digitalWrite(PIN_IN1, LOW);
    digitalWrite(PIN_IN2, LOW);
    analogWrite(PIN_ENA, 0);
  }
}

void ajustarDirecao(int angulo) {
  Serial.print("Angulo Direcao: ");
  Serial.println(angulo);
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_TEXT) {
    String mensagem = String((char*)payload);
    int divisor = mensagem.indexOf(':');
    
    if (divisor != -1) {
      String comando = mensagem.substring(0, divisor);
      int valor = mensagem.substring(divisor + 1).toInt();

      if (comando == "movimento") {
        ajustarMotores(valor);
      } else if (comando == "direcao") {
        ajustarDirecao(valor);
      }
    }
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  pinMode(PIN_ENA, OUTPUT);

  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("IP da ESP: ");
  Serial.println(IP); 

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
}

void loop() {
  webSocket.loop();
}