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
    io=socketio.listen(server);//����Socket.IO�����������������������е�http��������
    io.set("log level",1);

    io.sockets.on("connection",function(socket){//����ÿ���û����ӵĴ����߼�
        guestNumber=assignGuestName(socket,guestNumber,nickNames,namesUsed);//���û���������ʱ������һ���ÿ���
        joinRoom(socket,"Lobby");//���û���������ʱ��������������lobby��

        handleMessageBroadcasting(socket,nickNames);//�����û�����Ϣ
        handleNamechangeAttempts(socket,nickNames,namesUsed);//�û�����
        handleRoomJoining(socket);//�����ҵĴ����ͱ��

        socket.on("rooms",function(){//�û���������ʱ�������ṩ�Ѿ���ռ�õ������ҵ��б�
            socket.emit("rooms",io.sockets.manager.rooms);
        });
        handleClientDisconnection(socket,nickNames,namesUsed);//�����û��Ͽ����Ӻ������߼�
    });
};

//�����û��ǳ�
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
//����������
function joinRoom(socket,room){
    socket.join(room);//���û����뷿��
    currentRoom[socket.id]=room;//��¼�û��ĵ�ǰ����
    socket.emit("joinResult",{"room":room});//֪ͨ�û��������µķ���
    socket.broadcast.to(room).emit("message",{
        text:nickNames[socket.id]+" has joined "+room+"."
    });
    var usersInRoom=io.sockets.clients(room);//ȷ����Щ�û��ڷ���
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
            if(namesUsed.indexOf(name)==-1){//Ҫ�ĵ����û���������
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
            }else{//������û����Ѵ���
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