const http=require("http");
const fs=require("fs");
const path=require("path");
const WebSocket=require("ws");
const PORT=process.env.PORT||3000;

const server=http.createServer((req,res)=>{
 let p=req.url.split("?")[0]; if(p==="/")p="/index.html";
 const file=path.join(__dirname,p);
 if(!file.startsWith(__dirname)||!fs.existsSync(file)){res.writeHead(404);return res.end("Not found")}
 const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css"};
 res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
 fs.createReadStream(file).pipe(res);
});

const wss=new WebSocket.Server({server});
const rooms=new Map();

const same=(a,b)=>String(a).trim().toLocaleLowerCase()===String(b).trim().toLocaleLowerCase();

wss.on("connection",ws=>{
 ws.on("message",raw=>{
  let m;try{m=JSON.parse(raw)}catch{return}

  if(m.type==="join"){
   const room=String(m.room||"").trim().toUpperCase().slice(0,12);
   const nick=String(m.nickname||"").trim().replace(/\s+/g," ").slice(0,20);
   const pw=String(m.password||"");

   if(!room||nick.length<2||!pw){
    ws.send(JSON.stringify({type:"error",message:"닉네임, 방 코드, 비밀번호가 필요합니다."}));return;
   }

   let r=rooms.get(room);
   if(!r){r={password:pw,peers:[]};rooms.set(room,r)}
   else if(r.password!==pw){
    ws.send(JSON.stringify({type:"error",message:"방 비밀번호가 올바르지 않습니다."}));return;
   }

   if(r.peers.length>=2){
    ws.send(JSON.stringify({type:"error",message:"방이 가득 찼습니다."}));return;
   }

   if(r.peers.some(p=>same(p.nickname,nick))){
    ws.send(JSON.stringify({type:"error",message:"이미 사용 중인 닉네임입니다."}));return;
   }

   ws.room=room;ws.nickname=nick;ws.initiator=r.peers.length===0;r.peers.push(ws);
   ws.send(JSON.stringify({type:"joined",initiator:ws.initiator}));

   if(r.peers.length===2){
    r.peers.forEach(p=>p.send(JSON.stringify({
      type:"peer-ready",
      nickname:r.peers.find(x=>x!==p)?.nickname||"친구"
    })));
   }
  }

  if(m.type==="signal"){
   const r=rooms.get(ws.room);
   if(!r)return;
   // IMPORTANT: signaling server only relays WebRTC negotiation data.
   // Chat text and file bytes are never handled by this server.
   r.peers.filter(p=>p!==ws&&p.readyState===1).forEach(p=>p.send(JSON.stringify(m)));
  }
 });

 ws.on("close",()=>{
  const r=rooms.get(ws.room);
  if(!r)return;
  r.peers=r.peers.filter(p=>p!==ws);
  r.peers.forEach(p=>p.send(JSON.stringify({type:"peer-left"})));
  if(!r.peers.length)rooms.delete(ws.room);
  // No chat history, files, or message database exists to clean up.
 });
});

server.listen(PORT,()=>console.log("SECRET TALK V5 running on port "+PORT));
