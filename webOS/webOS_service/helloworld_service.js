/*
 * Copyright (c) 2024 LG Electronics Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-var */
/* eslint-disable import/no-unresolved */

var pkgInfo = require('./package.json');
var Service = require('webos-service');
var service = new Service(pkgInfo.name);
var greeting = "Hello, World!";

const modbus = require('jsmodbus');
const net = require('net');
////////
const addresses = ['192.168.0.101', '192.168.0.102', '192.168.0.103'];
const port = 502;
const sockets = [];
const clients = [];
//const client = new modbus.client.TCP(socket);
var isconnected = [false,false,false];
let timeoutHandle;

let temp_auto_en = false;
let temp_limit = 40;
let cooler_sw = false;

let timer_id;
let timer_id2;
let dev0_rcoil =null;
let dev0_rreg =null;
let dev1_rreg =null;
let dev2_rreg =null;

//램프가 켜지면 운전중
var old_task_run_state = false;

//수위센서의 이전상태
var old_level_state = 0;
//true가 되면 자동화와 펌프는 작동할수 없음
var level_blocking = false;

// 소켓 생성
for (let i = 0; i < addresses.length; i++) {
    sockets[i] = new net.Socket();
    clients[i] = new modbus.client.TCP(sockets[i]);
}

// 접속 함수
function connectSocket(socket, address, port, num) {
    socket.connect(port, address, () => {
        console.log(`Connected to ${address}:${port}`);
        isconnected[num] = true;
    });

    socket.on('close', (hadError) => {
        if (hadError) {
            console.error(`Connection to ${address}:${port} closed due to an error`);
        } else {
            console.log(`Connection to ${address}:${port} closed`);
        }
        isconnected[num] = false;
    });  

    socket.on('error', (err) => {
        console.error(`Error on ${address}:${port}: ${err.message}`);
        isconnected[num] = false;
    });
}

// 접속 해제 함수
function disconnectSocket(socket, callback) {
    if (socket.destroyed) {
        if (callback) callback();
        return;
    }

    socket.end(() => {
        console.log('Disconnected from server');
        if (callback) callback();
    });

    // 일정 시간 후 강제로 소켓 종료 (안전하게 종료되지 않는 경우)
    setTimeout(() => {
        if (!socket.destroyed) {
            socket.destroy();
            if (callback) callback();
        }
    }, 1000); //1초 후 강제 종료
}

// 모든 소켓 접속 함수
function connectAllSockets() {
    for (let i = 0; i < addresses.length; i++) {
        connectSocket(sockets[i], addresses[i], port,i);
    }
}

// 모든 소켓 접속 해제 함수
function disconnectAllSockets(callback) {
    let disconnectedCount = 0;

    function onDisconnected() {
        disconnectedCount++;
        if (disconnectedCount === sockets.length) {
            if (callback) callback();
        }
    }

    for (let i = 0; i < sockets.length; i++) {
        disconnectSocket(sockets[i], onDisconnected);
    }
}

// 모든 소켓 재접속 함수
function reconnectAllSockets() {
    disconnectAllSockets(() => {
        console.log('All sockets disconnected. Reconnecting...');
        // 소켓 생성
        for (let i = 0; i < addresses.length; i++) {
            sockets[i] = new net.Socket();
            clients[i] = new modbus.client.TCP(sockets[i]);
        }
        connectAllSockets();
    });
}
function checkSocketConnection(socket) {
    return socket.connecting === false && socket.destroyed === false;
}

service.register("isconnected", function(message) {
  message.respond({
	returnValue: true,
	message: isconnected
  });
});
service.register("reconnect", (msg)=> {
    reconnectAllSockets();

    //작동중인게 있다면 종료
    //여기서 서비스내 modbus 작업 시작
       if(timer_id != null){
            clearInterval(timer_id);
            timer_id = null;
        }
        if(timer_id2 != null){
            clearInterval(timer_id2);
            timer_id2 = null;
        }
        timer_id = setInterval(function () {
        	 read_dev0_coils();
              read_dev0_reg();
       }, 100);
       timer_id2 = setInterval(function () {
              read_dev1_reg();
              read_dev2_reg();
       }, 1000);
});
////////

service.register("light_control", (msg)=> {
    //일단 식물조명을 켠다
    if(isconnected[0]){
	    clients[0].writeSingleCoil(2, true)
	    .then(function (resp) {
             		//정해진 시간뒤에 OFF
		service.call("luna://com.webos.notification/createToast", {message:"식물조명이 "+(msg.payload.delay/1000)+"초 후에 OFF됩니다!"}, function(m2) {});
	             setTimeout(() => {
                                       if(isconnected[0]){
				clients[0].writeSingleCoil(2, false)
   				 .then(function (resp) {
    					  console.log(resp);
	   			 }).catch(function () {
   					   console.error(arguments);
   			 	});  
                                        }
		}, msg.payload.delay);
      		console.log(resp);
	    }).catch(function () {
      		console.error(arguments);
    	});
    }
});
service.register("toast", (msg)=> {

    service.call("luna://com.webos.notification/createToast", {message:msg.payload.msg}, function(m2) {});
});

service.register("close_socket", (msg)=> {
   sockets[msg.payload.num].destroy();
});

service.register("wrtie_coil", function(message) {
  if(isconnected[0]){
 
      if(message.payload.num == 1){
          //펌프 제어에 대한 신호라면
          //블록킹이 걸려있다면 이 명령어는 무시된다
          if(level_blocking){
              service.call("luna://com.webos.notification/createToast", {message:"양액통에 물이 부족합니다!"}, function(m2) {});
          }else{
              clients[0].writeSingleCoil(message.payload.num, message.payload.state)
                .then(function (resp) {
                  console.log(resp);
                }).catch(function () {
                  console.error(arguments);
                });
          }
      }else{
          //펌프말고는 상관없음
          clients[0].writeSingleCoil(message.payload.num, message.payload.state)
            .then(function (resp) {
              console.log(resp);
            }).catch(function () {
              console.error(arguments);
            });
      }
  }else{
    service.call("luna://com.webos.notification/createToast", {message:"PLC와 연결되지 않았습니다!"}, function(m2) {});
  }

});
service.register("task_run", function(message) {
  if(isconnected[0]){
      if(level_blocking){
          //블록킹이 걸려있다면 이 명령어는 무시된다
          service.call("luna://com.webos.notification/createToast", {message:"양액통에 물이 부족합니다!"}, function(m2) {});
      }else{
            clients[0].writeSingleRegister(0, 1)
              .then(function (resp) {
                console.log(resp);
              }).catch(function () {
                console.error(arguments);
              });
      }//blocking
  }else{
      service.call("luna://com.webos.notification/createToast", {message:"PLC와 연결되지 않았습니다!"}, function(m2) {});
  }
});
service.register("task_stop", function(message) {
  if(isconnected[0]){
  clients[0].writeSingleRegister(0, 2)
    .then(function (resp) {
      console.log(resp);
    }).catch(function () {
      console.error(arguments);
    });
  }else{
    service.call("luna://com.webos.notification/createToast", {message:"PLC와 연결되지 않았습니다!"}, function(m2) {});
  }
});
service.register("set_on_time", function(message) {
  if(isconnected[0]){
  clients[0].writeSingleRegister(1,message.payload.t)
    .then(function (resp) {
      console.log(resp);
    }).catch(function () {
      console.error(arguments);
    });
  }else{
    service.call("luna://com.webos.notification/createToast", {message:"PLC와 연결되지 않았습니다!"}, function(m2) {});
  }
});
service.register("set_off_time", function(message) {
  if(isconnected[0]){
  clients[0].writeSingleRegister(2,message.payload.t)
    .then(function (resp) {
      console.log(resp);
    }).catch(function () {
      console.error(arguments);
    });
  }else{
    service.call("luna://com.webos.notification/createToast", {message:"PLC와 연결되지 않았습니다!"}, function(m2) {});
  }
});

function read_dev0_coils(){
  if(isconnected[0]){
 	 clients[0].readCoils(0, 4)
   	 .then(function (resp) {
	         //직전 램프상태를 기준으로 자동화가 시작되었는지 여부를 알아냄
                      //펌프 블록킹 상태에서 램프가 점멸될때 toast가 출력된다
                      //블록킹중에는 이부분을 무시한다
                      if(!level_blocking){
                          var now_task_run_state = resp.response._body._valuesAsArray[0];
                          if(now_task_run_state == true && old_task_run_state == false){
                             //작업시작
                            service.call("luna://com.webos.notification/createToast", {message:"운전모드로 전환되었습니다!"}, function(m2) {});
                          }else if(now_task_run_state == false && old_task_run_state == true){
                             //작업종료
		    service.call("luna://com.webos.notification/createToast", {message:"중지모드로 전환되었습니다!"}, function(m2) {});

                          }//END_IF
                          old_task_run_state = now_task_run_state;
                      }//level_blocking
                      dev0_rcoil = resp;
	    }).catch(function () {
             	console.error(arguments);
                         isconnected[0] = false;
    	});
   }
}

service.register("read_coils", function(message) {
    if(dev0_rcoil != null){
        message.respond({
	returnValue: true,
  	message: dev0_rcoil
        });
    }
});

function read_dev0_reg(){
  if(isconnected[0]){
 	 clients[0].readHoldingRegisters(1, 2)
   	 .then(function (resp) {
   	  //console.log(resp);
                     dev0_rreg = resp;
	    }).catch(function () {
      	console.error(arguments);
    	});
   }
}

service.register("read_register0", function(message) {
    if(dev0_rreg != null){
        message.respond({
	returnValue: true,
  	message: dev0_rreg
        });
    }
});

service.register("set_fan_mode", function(message) {
  temp_auto_en = message.payload.en;
  if(!temp_auto_en) cooler_sw = false;
});
service.register("set_fan_temp", function(message) {
  temp_limit = message.payload.temp;
});

function read_dev1_reg(){
  if(isconnected[1]){
 	 clients[1].readInputRegisters(0, 4)
   	 .then(function (resp) {
   	  //console.log(resp);
                         //let temp_auto_en = false;
		//let temp_limit = 40;
                         //data.message.response._body._values;
                        if(temp_auto_en){
                            //쿨러자동화가 active인경우
                            var now_temp = resp.response._body._values[0]/10.0;
                            if(now_temp > temp_limit){
                               //설정한 온도보다 현재온도가 높은경우
                               //쿨러 작동
                                    if(isconnected[0]){
 				 clients[0].writeSingleCoil(03, true)
  				  .then(function (resp) {
  				    console.log(resp);
  				  }).catch(function () {
    				  console.error(arguments);
   				 });
  			}
                            }else if(now_temp < temp_limit){
                                    if(isconnected[0]){
 				 clients[0].writeSingleCoil(3, false)
  				  .then(function (resp) {
  				    console.log(resp);
  				  }).catch(function () {
    				  console.error(arguments);
   				 });
  			}
                            }
                        }
                        dev1_rreg = resp;
	    }).catch(function () {
      	console.error(arguments);
    	});
   }
}

service.register("read_register1", function(message) {
    if(dev1_rreg != null){
      	                    message.respond({
				returnValue: true,
				message: dev1_rreg,
                                                  temp_en:temp_auto_en,
                                                  set_temp:temp_limit
			});
    }
});

function read_dev2_reg(){
  if(isconnected[2]){
 	 clients[2].readInputRegisters(0, 2)
   	 .then(function (resp) {
                    //만약 수위센서가 있음에서 없음으로 전환되면 알람발생시킨다
                      var now_level_state = resp.response._body._values[1]*1;
                      if(now_level_state == 0 && old_level_state == 1){
                        console.log("물부족상태 감지");
                         level_blocking = true;
                        service.call("luna://com.webos.notification/createToast", {message:"양액이 부족합니다! 펌프자동화를 강제종료합니다!"}, function(m2) {});
                        if(isconnected[0]){
                            clients[0].writeSingleRegister(3, 1)
                              .then(function (resp) {
                                console.log(resp);
                            }).catch(function () {
                              console.error(arguments);
                            });
                          }
                      }else if(now_level_state == 1 && old_level_state == 0){
                        console.log("물부족상태 해제");
                        if(isconnected[0]){
                            clients[0].writeSingleRegister(3, 0)
                              .then(function (resp) {
                                console.log(resp);
                            }).catch(function () {
                              console.error(arguments);
                            });
                          }
                         level_blocking = false;
                      }//END_IF
                      old_level_state = now_level_state;
      	        dev2_rreg = resp;
	    }).catch(function () {
      	console.error(arguments);
    	});
   }
}

service.register("read_register2", function(message) {
    if(dev2_rreg != null){
      	                    message.respond({
				returnValue: true,
				message: dev2_rreg,
                                                  level_flag:level_blocking
			});
    }
});
// set some state in the service
service.register("msg_test", function(message) {
	console.log("In setGreeting callback");
	if (message.payload.greeting) {
		greeting = message.payload.greeting;
	} else {
		message.respond({
			returnValue: false,
			errorText: "argument 'greeting' is required",
			errorCode: 1
		});
	}
	message.respond({
		returnValue: true,
		greeting: greeting
	});
});
