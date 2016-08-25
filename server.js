/**
 * Created by zhangxitian on 2016/8/9.
 */
var http=require('http');
var fs=require('fs');
var path=require('path');
var mime=require('mime');
var cache={};

function send404(response){
    response.writeHead(404,{'Content-Type':"text/plain"});
    response.write('Error 404:response not found.');
    response.end();
}

function sendFile(response, filePath, fileContents){
    response.writeHead(200,
        {'content-type':mime.lookup(path.basename(filePath))}
    );
    response.end(fileContents);
}

function serveStatic(response, cache, absPath){
    if(cache[absPath]){//����ļ��Ƿ񻺴����ڴ���
        sendFile(response,absPath,cache[absPath]);//���ڴ��з����ļ�
    }else{
        fs.exists(absPath,function(exists){//����ļ��Ƿ����
            if(exists){
                fs.readFile(absPath,function(err,data){//��Ӳ���ж�ȡ�ļ�
                    if(err){
                        send404(response);
                    }else{
                        cache[absPath]=data;
                        sendFile(response,absPath,data);//��Ӳ���ж�ȡ�ļ�������
                    }
                });
            }else{
                send404(response);//����http 404��Ӧ
            }
        })
    }
}

var server=http.createServer(function(request,response){//����http�����������������������ÿ������Ĵ�����Ϊ
    var filePath=false;
    if(request.url=='/'){
        filePath='public/index.html';//ȷ�����ص�Ĭ��html�ļ�
    }else{
        filePath='public'+request.url;//��url·��תΪ�ļ������·��
    }
    var absPath='./'+filePath;
    serveStatic(response,cache,absPath);//���ؾ�̬�ļ�
});

server.listen(8888,function(){
   console.log("server listening on port 8888.")
});

var chatServer=require("./lib/chat_server");
chatServer.listen(server);