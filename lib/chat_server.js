/**
 * Created by zhangxitian on 2016/8/10.
 */
var socketio=require("socket.io");
var io;
var guestNumber=1;
var nickNames={};
var namesUsed=[];
var currentRoom={};

exports.listen=function(server){
    io=socketio.listen(server);//启动Socket.IO服务器，允许他搭载在已有的http服务器上
    io.set("log level",1);

    io.sockets.on("connection",function(socket){//定义每个用户连接的处理逻辑
        guestNumber=assignGuestName(socket,guestNumber,nickNames,namesUsed);//在用户连接上来时赋予其一个访客名
        joinRoom(socket,"Lobby");//在用户连接上来时把他放入聊天室lobby里

        handleMessageBroadcasting(socket,nickNames);//处理用户的消息
        handleNamechangeAttempts(socket,nickNames,namesUsed);//用户改名
        handleRoomJoining(socket);//聊天室的创建和变更

        socket.on("rooms",function(){//用户发送请求时，向其提供已经被占用的聊天室的列表
            socket.emit("rooms",io.sockets.manager.rooms);
        });
        handleClientDisconnection(socket,nickNames,namesUsed);//定义用户断开连接后的清除逻辑
    });
};

//分配用户昵称
function assignGuestName(socket,guestNumber,nickNames,namesUsed){
    var name="Guest"+guestNumber;
    nickNames[socket.id]=name;
    socket.emit("nameResult",{
        success:true,
        name:name
    });
    namesUsed.push(name);
    return guestNumber+1;
}
//进入聊天室
function joinRoom(socket,room){
    socket.join(room);//让用户进入房间
    currentRoom[socket.id]=room;//记录用户的当前房间
    socket.emit("joinResult",{"room":room});//通知用户进入了新的房间
    socket.broadcast.to(room).emit("message",{
        text:nickNames[socket.id]+" has joined "+room+"."
    });
    var usersInRoom=io.sockets.clients(room);//确定哪些用户在房间
    if(usersInRoom.length>1){
        var usersInRoomSummary="users currently in "+room+":";
        for(var index in usersInRoom){
            var userSocketId=usersInRoom[index].id;
            if(userSocketId!=socket.id){
                if(index>0){
                    usersInRoomSummary+=",";
                }
                usersInRoomSummary+=nickNames[userSocketId];
            }
        }
        usersInRoomSummary+=".";
        socket.emit("room",{text:usersInRoomSummary});
    }
}

function handleNamechangeAttempts(socket,nickNames,namesUsed){
    socket.on("nameAttempt",function(name){
        if(name.indexOf("Guest")==0){
            socket.emit("nameResult",{
                success:false,
                message:"Names cannot begin with <Guest> ."
            });
        }else{
            if(namesUsed.indexOf(name)==-1){//要改的我用户名不存在
                var previousName=nickNames[socket.id];
                var previousNameIndex=namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id]=name;
                delete namesUsed[previousNameIndex];
                socket.emit("nameResult",{
                    success:true,
                    name:name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit("message",{
                   text:previousName+"is now known as "+name+"."
                });
            }else{//申请的用户名已存在
                socket.emit("nameResult",{
                    success:false,
                    message:"That name is already in use."
                });
            }
        }
    })
}

function handleMessageBroadcasting(socket){
    socket.on("message",function(message){
       socket.broadcast.to(message.room).emit("message",{
           text:nickNames[socket.id]+": "+message.text
       });
    });
}

function handleRoomJoining(socket){
    socket.on("join",function(room){
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket,room.newRoom);
    });
}

function handleClientDisconnection(socket){
    socket.on("disconnect",function(){
        var nameIndex=namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}