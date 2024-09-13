심심한녹칸다의 2024 임베디드경진대회 webOS부문 소스코드 페이지!  
  
webOS : webOS 웹앱과 서비스 코드  
----webOS_HMI : 웹앱  
----webOS_service : 서비스  
  
NODE01_LS_PLC : LS산전의 PLC인 XEM-DN32H2에 업로드되는 ST언어로 작성된 자동화코드  
----XEM_DN32H2.txt : PLC코드  
----plc_variable.PNG : 변수설정  
  
NODE02_ESP8266 : ESP8266보드에 온습도센서(DHT11)와 이산화탄소센서(CCS811)을 연결해서 측정값을 webOS로 전송하는 코드  
----sensor_node1.ino : ESP8266코드  
----Gerber_webos_board1.zip : 전용 PCB보드 거버파일  
  
NODE03_ESP8266 : ESP8266보드에 유량센서(YF-S401)와 비접촉수위센서(XKC-Y25-V)를 연결해서 측정값을 webOS로 전송하는 코드  
----sensor_node2.ino : ESP8266코드  
----Gerber_webos_board2.zip : 전용 PCB보드 거버파일  
  
NODE04_TOPST_D3 : Topst D3보드에 V4L2카메라를 연결해서 실시간으로 yolo v8로 객체인식을 하기위한 모델과 코드  
----detect.py : 객체인식 파이썬코드  
----best.pt : 정상식물과 비정상식물을 구분하기 위한 학습모델  

