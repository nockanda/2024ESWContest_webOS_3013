#include <ESP8266WiFi.h>

#define led_connected D6
#define led_recived D7
#define flow D3
#define level D4

//사물인터넷보드가 무선공유기에 연결되어야한다!
//무선공유기 ID PW

#ifndef STASSID
#define STASSID "yourid"
#define STAPSK  "yourpw"
#endif

const char* ssid = STASSID;
const char* password = STAPSK;

//IoT보드가 서버역할을 하겠다!(1~65536)
WiFiServer server(502); //서버를 502번 포트에 열겠다!

byte buff[20];

byte res[] = {0x00,0x01,0x00,0x00,0x00,0x07,0x01,0x04,0x04,0x00,0x00,0x00,0x00};

unsigned long main_t = 0;
uint16_t mydata[4];
volatile float water = 0;

ICACHE_RAM_ATTR void blink(){
  water += (1/5888.0)*1000; //단위mL
}

void setup() {
  // Enable serial
  Serial.begin(115200);

  pinMode(led_connected,OUTPUT);
  pinMode(led_recived,OUTPUT);
  pinMode(level,INPUT);
  pinMode(flow,INPUT);
  attachInterrupt(digitalPinToInterrupt(flow), blink, FALLING);
  
  // Connect to WiFi network
  Serial.println();
  Serial.println();
  Serial.print(F("Connecting to "));
  Serial.println(ssid);
  IPAddress ip (192, 168, 0, 103); //내가 원하는 IP
  IPAddress gateway (192, 168, 0, 1);
  IPAddress subnet (255, 255, 255, 0);

  WiFi.config (ip, gateway, subnet); //내가 원하는 설정 반영
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(F("."));
  }
  Serial.println();
  Serial.println(F("WiFi connected"));

  // Start the server
  server.begin();
  Serial.println(F("Server started"));

  // Print the IP address
  Serial.println(WiFi.localIP());
}


void loop() {
  //서버가 클라이언트의 접속을 기다리는것을 listen한다라고 표현한다!
  WiFiClient client = server.available();
  //클라이언트가 접속한 상태가 아니라면 = 소켓이 생성된 상태가 아니라면~
  if (!client) {
    digitalWrite(led_connected,LOW);
    return;
  }
  digitalWrite(led_connected,HIGH);
  
  Serial.println("새로운 클라이언트의 등장!");

  while(client.connected()){
    if(millis() - main_t > 100){
      main_t = millis();
      //유속(소수점2자리를 표현하기 위해서 100을 곱해서 전송한다)
      //단위 mL/s
      mydata[0] = water*10*100;
      water = 0;
    }
    
    if(client.available()){
      digitalWrite(led_recived,!digitalRead(led_recived));
      //헤더6바이트 //데이터6바이트
      //헤더6바이트 //응답7바이트
      client.readBytes(buff,12);

     //수위센서
      mydata[1] = digitalRead(level);

      res[0] = buff[0];
      res[1] = buff[1];
      res[9] = mydata[0]/256;
      res[10] = mydata[0]%256;
      res[11] = mydata[1]/256;
      res[12] = mydata[1]%256;
      client.write(res,sizeof(res));
    }
  }

  Serial.println("클라이언트와 접속이 끊어졌다!");
}
