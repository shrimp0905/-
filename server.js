const http=require("http");
const fs=require("fs");
const path=require("path");
const WebSocket=require("ws");

const PORT=Number(process.env.PORT||3000);
const HOST="0.0.0.0";
const rooms=new Map();

const server=http.createServer((req,res)=>{
  const pathname=(req.url||"/").split("?")[0];
  const file=pathname==="/" ? path.join(__dirname,"index.html") : path.join(__dirname,pathname.replace(/^\/+/,""));
  if(!file.startsWith(__dirname)||!fs.existsSync(file)){
    res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"});
    return res.end("Not found");
  }
  const ext=path.extname(file);
  const type={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css"}[ext]||"application/octet-stream";
  res.writeHead(200,{"Content-Type":type,"Cache-Control":"no-store, no-cache, must-revalidate, max-age=0","Pragma":"no-cache","Expires":"0"});
  fs.createReadStream(file).pipe(res);
});

const wss=new WebSocket.Server({server,maxPayload:256*1024});

function cleanNick(v){return String(v||"").trim().replace(/\s+/g," ").slice(0,20);}
function cleanRoom(v){return String(v||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,12);}
function same(a,b){return String(a).toLocaleLowerCase()===String(b).toLocaleLowerCase();}

function send(ws,obj){
  if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

wss.on("connection",ws=>{
  ws.on("message",raw=>{
    let m;try{m=JSON.parse(raw.toString())}catch{return}

    if(m.type==="join"){
      const room=cleanRoom(m.room);
      const nickname=cleanNick(m.nickname);
      const password=String(m.password||"");

      if(room.length<4||nickname.length<2||!password){
        send(ws,{type:"error",message:"방 코드, 닉네임, 비밀번호를 확인하세요."});return;
      }

      let r=rooms.get(room);
      if(!r){
        r={password,owner:null,peers:[]};
        rooms.set(room,r);
      }else if(r.password!==password){
        send(ws,{type:"error",message:"방 비밀번호가 올바르지 않습니다."});return;
      }

      if(r.peers.length>=2){
        send(ws,{type:"error",message:"방이 가득 찼습니다. 최대 2명까지 연결할 수 있습니다."});return;
      }
      if(r.peers.some(p=>same(p.nickname,nickname))){
        send(ws,{type:"error",message:"이미 사용 중인 닉네임입니다."});return;
      }

      ws.room=room;ws.nickname=nickname;ws.isOwner=!r.owner;
      if(!r.owner)r.owner=ws;
      r.peers.push(ws);

      send(ws,{type:"joined",initiator:r.peers.length===1,owner:ws.isOwner});
      if(r.peers.length===2){
        const other=r.peers.find(p=>p!==ws);
        r.peers.forEach(p=>send(p,{type:"peer-ready",nickname:other===p?ws.nickname:other.nickname}));
      }
      return;
    }

    if(m.type==="signal"){
      const r=rooms.get(ws.room);if(!r)return;
      // Only WebRTC signaling is relayed. Chat/file payloads never reach this server.
      r.peers.filter(p=>p!==ws).forEach(p=>send(p,{type:"signal",data:m.data}));
      return;
    }

    if(m.type==="delete-room"){
      const r=rooms.get(ws.room);if(!r)return;
      if(r.owner!==ws){send(ws,{type:"error",message:"방을 삭제할 권한이 없습니다."});return;}
      r.peers.forEach(p=>send(p,{type:"room-deleted"}));
      rooms.delete(ws.room);
      return;
    }
  });

  ws.on("close",()=>{
    const room=ws.room;
    if(!room)return;
    const r=rooms.get(room);if(!r)return;

    r.peers=r.peers.filter(p=>p!==ws);
    r.peers.forEach(p=>send(p,{type:"peer-left"}));

    if(r.owner===ws){
      if(r.peers.length){
        r.owner=r.peers[0];
        r.owner.isOwner=true;
      }else{
        rooms.delete(room);
      }
    }else if(r.peers.length===0){
      rooms.delete(room);
    }
  });
});

server.listen(PORT,HOST,()=>console.log(`SECRET TALK running on ${HOST}:${PORT}`));
