/**
 * 拾遗 · 雅致全功能版
 * 集成：宋体美化、双栏预览、分享、字数统计、强效安全锁、退出登录
 */

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  try {
    const P = (typeof PASSWORD !== 'undefined' && PASSWORD !== "") ? PASSWORD : "SECURE_LOCK_ACTIVE";
    const DB = typeof JIANDAN_NOTES !== 'undefined' ? JIANDAN_NOTES : null;

    if (!DB) return new Response("KV 绑定缺失", { status: 500 });

    const u = new URL(event.request.url);
    const id = u.searchParams.get("id");
    const cursor = u.searchParams.get("cursor") || "";
    const pass = event.request.headers.get("x-p");

    if (u.pathname === "/api/get" && id) {
      const data = await DB.get(id);
      if (!data) return new Response(JSON.stringify({t:"未找到", c:"内容已焚毁"}), { headers: { "Content-Type": "application/json" } });
      return new Response(data, { headers: { "Content-Type": "application/json" } });
    }

    if (u.pathname.startsWith("/api/admin/")) {
      if (!pass || pass !== P) return new Response("Forbidden", { status: 403 });
      
      if (u.pathname === "/api/admin/list") {
        const { keys, list_complete, cursor: nextCursor } = await DB.list({ limit: 30, cursor });
        const list = await Promise.all(keys.map(async k => {
          const v = JSON.parse(await DB.get(k.name) || "{}");
          return { id: k.name, t: v.t || "无题", d: v.d || "" };
        }));
        return new Response(JSON.stringify({ list, nextCursor, complete: list_complete }));
      }
      
      if (u.pathname === "/api/admin/save") {
        const body = await event.request.json();
        const nid = body.id || crypto.randomUUID().split('-')[0];
        await DB.put(nid, JSON.stringify({ t: body.t || "无题", c: body.c || "", d: new Date().toLocaleDateString() }));
        return new Response(JSON.stringify({ id: nid }));
      }

      if (u.pathname === "/api/admin/del" && id) {
        await DB.delete(id);
        return new Response(JSON.stringify({ success: true }));
      }
    }

    if (id) return new Response(renderReader(), { headers: { "Content-Type": "text/html;charset=utf-8" } });
    return new Response(renderAdmin(), { headers: { "Content-Type": "text/html;charset=utf-8" } });

  } catch (err) {
    return new Response("系统波动: " + err.message, { status: 500 });
  }
}

function renderReader() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>拾遗</title><script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script><style>
    body { margin: 0; background: #f9f7f2; color: #2c2c2c; font-family: "Georgia", "Songti SC", "STSong", "SimSun", serif; display: flex; justify-content: center; -webkit-font-smoothing: antialiased; }
    article { width: 90%; max-width: 750px; padding-bottom: 100px; }
    .header-wrapper { position: sticky; top: 0; background: rgba(249, 247, 242, 0.95); backdrop-filter: blur(10px); padding: 60px 0 30px 0; z-index: 10; border-bottom: 1px solid rgba(0,0,0,0.05); }
    h1 { font-size: 38px; margin: 0; color: #1a1a1a; font-weight: 500; letter-spacing: 1px; }
    #date { font-size: 13px; color: #a5a298; margin-top: 15px; letter-spacing: 2px; }
    #content { line-height: 2.2; font-size: 20px; padding-top: 50px; letter-spacing: 0.5px; word-break: break-word; }
    #content pre { background: #f1eee6; padding: 25px; overflow-x: auto; border-radius: 4px; border: 1px solid #e8e4d9; font-family: monospace; }
    .f { margin-top: 120px; border-top: 1px dotted #d1cec2; padding-top: 30px; font-size: 13px; color: #a5a298; text-align: center; letter-spacing: 4px; }
  </style></head><body><article><div class="header-wrapper"><h1 id="t"></h1><div id="date"></div></div><div id="content"></div><div class="f">—— 拾遗 · 完满 ——</div></article><script>
    const tid=new URLSearchParams(window.location.search).get('id');
    fetch('/api/get?id='+tid).then(r=>r.json()).then(d=>{
      document.getElementById('t').innerText=d.t;
      document.getElementById('date').innerText=d.d||'';
      document.getElementById('content').innerHTML=marked.parse(d.c);
      document.title=d.t;
    });
  </script></body></html>`;
}

function renderAdmin() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>工作台</title><script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script><style>
    :root { --accent: #2b466b; --paper: #fdfcf8; }
    body { margin: 0; font-family: "Songti SC", "STSong", serif; height: 100vh; display: flex; flex-direction: column; background: var(--paper); color: #2c2c2c; }
    header { background: var(--accent); height: 55px; display: flex; align-items: center; justify-content: space-between; padding: 0 30px; color: white; flex-shrink: 0; }
    #lock { position: fixed; inset: 0; background: var(--paper); z-index: 999; display: flex; align-items: center; justify-content: center; }
    .login-box { text-align: center; padding: 50px; background: #fff; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
    .container { flex: 1; display: flex; overflow: hidden; }
    aside { width: 280px; background: #fff; border-right: 1px solid #f0ede4; display: flex; flex-direction: column; }
    #ls { flex: 1; overflow-y: auto; padding: 15px; }
    .item { padding: 15px; cursor: pointer; border-radius: 4px; font-size: 15px; margin-bottom: 8px; display: flex; justify-content: space-between; transition: 0.3s; border: 1px solid transparent; }
    .active { background: #f9f7f2; border-color: #e8e4d9; font-weight: bold; }
    main { flex: 1; display: flex; flex-direction: column; position: relative; }
    #t { border: none; background: transparent; outline: none; font-size: 32px; font-family: serif; font-weight: 700; margin: 40px 40px 0 40px; }
    .edit-area { display: flex; flex: 1; gap: 30px; padding: 30px 40px; overflow: hidden; }
    textarea { flex: 1; border: none; background: rgba(255,255,255,0.6); padding: 25px; border-radius: 8px; outline: none; font-size: 19px; line-height: 1.8; font-family: inherit; border: 1px solid #f0ede4; resize: none; }
    #pre { flex: 1; overflow-y: auto; font-size: 19px; line-height: 1.8; padding: 10px; border-left: 1px dotted #e8e4d9; }
    .btn { cursor: pointer; padding: 7px 18px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.4); background: transparent; color: white; font-size: 12px; transition: 0.3s; }
    .btn:hover { background: rgba(255,255,255,0.1); }
    .save-btn { background: white; color: var(--accent); border: none; font-weight: bold; margin-left: 15px; }
    .del-btn { color: #d9d4c7; cursor: pointer; font-size: 14px; }
    .stat { position: absolute; bottom: 15px; right: 40px; font-size: 12px; color: #b5b2a9; }
  </style></head><body>
  <div id="lock"><div class="login-box"><div style="letter-spacing:4px; color:#a5a298; margin-bottom:20px">拾遗 · OWNER</div><input type="password" id="pw" style="text-align:center; border:none; border-bottom:1px solid #000; width:200px; outline:none; font-size:20px; padding:10px; background:transparent"><br><br><button onclick="login()" style="background:var(--accent); color:white; border:none; padding:10px 40px; cursor:pointer">开启书斋</button></div></div>
  <header><div style="font-size:20px; letter-spacing:3px">拾遗.</div><div><span class="btn" onclick="copyLink()">分享链接</span><button class="btn save-btn" id="sb" onclick="save()">存档 (Ctrl+S)</button><button class="btn" onclick="logout()" style="margin-left:15px; border-color:#d9d4c7;">退出</button></div></header>
  <div class="container"><aside><div id="ls"></div><div onclick="newN()" style="padding:25px; text-align:center; cursor:pointer; color:#a5a298; border-top:1px solid #f0ede4; font-size:14px">+ 开启新篇</div></aside>
  <main><input id="t" placeholder="在此拟题..."><div class="edit-area"><textarea id="c" placeholder="在此落笔..." oninput="onI()"></textarea><div id="pre"></div></div><div class="stat" id="st">字数统计: 0</div></main></div>
  <script>
    let p=localStorage.getItem('拾遗_P')||"",cur=null; const $=id=>document.getElementById(id);
    window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();save()}});
    const api=async(u,m="GET",b=null)=>{const r=await fetch(u,{headers:{"x-p":p,"Content-Type":"application/json"},method:m,body:b?JSON.stringify(b):null});if(r.status===403)return alert("身份校验失败");return r.json()};
    async function login(){p=$('pw').value||p; const d=await api("/api/admin/list"); if(d){localStorage.setItem('拾遗_P',p);$('lock').style.display="none";renderL(d.list)}}
    function renderL(items){$('ls').innerHTML=items.map(n=>\`<div class="item \${cur===n.id?'active':''}" onclick="loadN('\${n.id}')"><span>\${n.t}</span><span class="del-btn" onclick="delN(event,'\${n.id}')">✕</span></div>\`).join('')}
    async function loadN(id){cur=id; const d=await fetch('/api/get?id='+id).then(r=>r.json());$('t').value=d.t;$('c').value=d.c;onI();Array.from(document.querySelectorAll('.item')).forEach(el=>el.classList.remove('active'))}
    async function save(){const d=await api("/api/admin/save","POST",{t:$('t').value||"无题",c:$('c').value,id:cur});if(d){cur=d.id; $('sb').innerText="已收录"; setTimeout(()=>$('sb').innerText="存档 (Ctrl+S)",1000); login()}}
    async function delN(e,id){e.stopPropagation();if(confirm("确定焚毁此篇？")){await api("/api/admin/del?id="+id,"POST");if(cur===id)newN();login()}}
    function logout(){if(confirm("确定要离开书斋吗？")){localStorage.removeItem('拾遗_P');location.reload()}}
    function onI(){$('pre').innerHTML=marked.parse($('c').value||"");$('st').innerText="字数统计: "+$('c').value.length}
    function newN(){cur=null;$('t').value="";$('c').value="";onI();$('t').focus()}
    function copyLink(){if(!cur)return alert("尚未存档");navigator.clipboard.writeText(window.location.origin+"?id="+cur);alert("链接已复制")}
    $('pw').addEventListener('keypress',e=>{if(e.key==='Enter')login()}); if(p)login();
  </script></body></html>`;
}
