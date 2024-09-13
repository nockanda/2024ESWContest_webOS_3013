#include <Wire.h>    // I2C library
#include "ccs811.h"  // CCS811 library
#include "DHT.h"
#include <ESP8266WiFi.h>

#define led_connected D6
#define led_recived D7

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

byte res[] = {0x00,0x01,0x00,0x00,0x00,0x0B,0x01,0x04,0x08,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00};

#define DHTPIN D5
#define DHTTYPE DHT11 
DHT dht(DHTPIN, DHTTYPE); 
// Wiring for ESP8266 NodeMCU boards: VDD to 3V3, GND to GND, SDA to D2, SCL to D1, nWAKE to D3 (or GND)
//CCS811 ccs811(D3); // nWAKE on D3

// Wiring for Nano: VDD to 3v3, GND to GND, SDA to A4, SCL to A5, nWAKE to 13
//CCS811 ccs811(13); 

// nWAKE not controlled via Arduino host, so connect CCS811.nWAKE to GND
CCS811 ccs811; 

// Wiring for ESP32 NodeMCU boards: VDD to 3V3, GND to GND, SDA to 21, SCL to 22, nWAKE to D3 (or GND)
//CCS811 ccs811(23); // nWAKE on 23

unsigned long main_t = 0;
uint16_t mydata[4];

void setup() {
  // Enable serial
  Serial.begin(115200);

  pinMode(led_connected,OUTPUT);
  pinMode(led_recived,OUTPUT);
  
  Serial.println("");
  Serial.println("setup: Starting CCS811 basic demo");
  Serial.print("setup: ccs811 lib  version: "); Serial.println(CCS811_VERSION);
  dht.begin();
  // Enable I2C
  Wire.begin(); 
  
  // Enable CCS811
  ccs811.set_i2cdelay(50); // Needed for ESP8266 because it doesn't handle I2C clock stretch correctly
  bool ok= ccs811.begin();
  if( !ok ) Serial.println("setup: CCS811 begin FAILED");

  // Print CCS811 versions
  Serial.print("setup: hardware    version: "); Serial.println(ccs811.hardware_version(),HEX);
  Serial.print("setup: bootloader  version: "); Serial.println(ccs811.bootloader_version(),HEX);
  Serial.print("setup: application version: "); Serial.println(ccs811.application_version(),HEX);
  
  // Start measuring
  ok= ccs811.start(CCS811_MODE_1SEC);
  if( !ok ) Serial.println("setup: CCS811 start FAILED");

  // Connect to WiFi network
  Serial.println();
  Serial.println();
  Serial.print(F("Connecting to "));
  Serial.println(ssid);
  IPAddress ip (192, 168, 0, 102); //내가 원하는 IP
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
    if(millis() - main_t > 1000){
      main_t = millis();
  
      // Read
      uint16_t eco2, etvoc, errstat, raw;
      ccs811.read(&eco2,&etvoc,&errstat,&raw); 
      float h = dht.readHumidity();
      // Read temperature as Celsius (the default)
      float t = dht.readTemperature();
    
      mydata[0] = (uint16_t)(t*10);
      mydata[1] = (uint16_t)(h*10);
      
      // Print measurement results based on status
      if( errstat==CCS811_ERRSTAT_OK ) {
        mydata[2] = eco2;
        mydata[3] = etvoc;
      } else {
        mydata[2] = -999;
        mydata[3] = -999;
      }
    }
    
    if(client.available()){
      digitalWrite(led_recived,!digitalRead(led_recived));
      //헤더6바이트 //데이터6바이트
      //헤더6바이트 //응답7바이트
      client.readBytes(buff,12);
      res[0] = buff[0];
      res[1] = buff[1];
      res[9] = mydata[0]/256;
      res[10] = mydata[0]%256;
      res[11] = mydata[1]/256;
      res[12] = mydata[1]%256;
      res[13] = mydata[2]/256;
      res[14] = mydata[2]%256;
      res[15] = mydata[3]/256;
      res[16] = mydata[3]%256;
      client.write(res,sizeof(res));
    }
  }

  Serial.println("클라이언트와 접속이 끊어졌다!");
}
