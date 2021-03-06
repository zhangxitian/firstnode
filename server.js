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
    if(cache[absPath]){//检测文件是否缓存在内存中
        sendFile(response,absPath,cache[absPath]);//从内存中返回文件
    }else{
        fs.exists(absPath,function(exists){//检测文件是否存在
            if(exists){
                fs.readFile(absPath,function(err,data){//从硬盘中读取文件
                    if(err){
                        send404(response);
                    }else{
                        cache[absPath]=data;
                        sendFile(response,absPath,data);//从硬盘中读取文件并返回
                    }
                });
            }else{
                send404(response);//发送http 404响应
            }
        })
    }
}

var server=http.createServer(function(request,response){//创建http服务器，用匿名函数定义对每个请求的处理行为
    var filePath=false;
    if(request.url=='/'){
        filePath='public/index.html';//确定返回的默认html文件
    }else{
        filePath='public'+request.url;//将url路径转为文件的相对路径
    }
    var absPath='./'+filePath;
    serveStatic(response,cache,absPath);//返回静态文件
});

server.listen(8888,function(){
   console.log("server listening on port 8888.")
});

var chatServer=require("./lib/chat_server");
chatServer.listen(server);