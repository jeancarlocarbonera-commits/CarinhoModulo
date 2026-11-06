/*
 * ============================================================================
 * CÓDIGO BASE ESP32 - CONTROLE REMOTO DE CARRINHO (WEBSOCKETS)
 * ============================================================================
 * Biblioteca necessária: WebSockets by Markus Sattler
 * Este firmware mantém o controle de motor original e recebe o ângulo do volante.
 * ATENÇÃO: ajustarDirecao() ainda só informa o ângulo pela Serial; não há servo
 * configurado neste arquivo. O servo depende do modelo e do pino da montagem.
 * ============================================================================
 */

#include <WiFi.h>
#include <WebSocketsServer.h>

const char* ssid = "Carrinho_ESP";
const char* password = "12345678password";

WebSocketsServer webSocket = WebSocketsServer(81);

// Pinos da ponte H (confira se correspondem à sua placa).
const int PIN_IN1 = 26;
const int PIN_IN2 = 27;
const int PIN_ENA = 14;

void ajustarMotores(int velocidade) {
  velocidade = constrain(velocidade, -100, 100);

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
  angulo = constrain(angulo, -90, 90);
  Serial.print("Angulo Direcao recebido: ");
  Serial.println(angulo);

  // Ainda falta integrar aqui o servo/atuador da direção.
  // O pino e a biblioteca dependem do servo e da ligação usados no carrinho.
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  if (type != WStype_TEXT) return;

  // Constrói a mensagem respeitando o tamanho recebido pelo WebSocket.
  String mensagem;
  mensagem.reserve(length);
  for (size_t i = 0; i < length; i++) {
    mensagem += static_cast<char>(payload[i]);
  }

  int divisor = mensagem.indexOf(':');
  if (divisor < 0) return;

  String comando = mensagem.substring(0, divisor);
  int valor = mensagem.substring(divisor + 1).toInt();

  if (comando == "movimento") {
    ajustarMotores(valor);
  } else if (comando == "direcao") {
    ajustarDirecao(valor);
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  pinMode(PIN_ENA, OUTPUT);
  ajustarMotores(0);

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
