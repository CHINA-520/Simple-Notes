/**
 * 拾遗 · 雅集终极全功能版 (GitHub 安全同步版)
 * 1. 自动适配后台环境变量 PASSWORD 和 JIANDAN_NOTES
 * 2. 包含分享、预览、字数统计、删除、快捷存档
 * 3. 强效防御逻辑，防止空密码误开门
 */

// 监听请求
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  try {
    // 【1. 核心安全锁】强制获取后台变量，防止空密码绕过
    const P = (typeof PASSWORD !== 'undefined' && PASSWORD !== "") ? PASSWORD : "SECURE_LOCK_NOT_SET_BY_OWNER";
    const DB = typeof JIANDAN_NOTES !== 'undefined' ? JIANDAN_NOTES : null;

    if (!DB) return new Response("错误：未在 Cloudflare 后台找到 JIANDAN_NOTES 绑定", { status: 500 });

    const u = new URL(event.request.url);
    const id = u.searchParams.get("id");
    const cursor = u.searchParams.get("cursor") || "";
    // 从 Header 获取加密传输的密码
    const pass = event.request.headers.get("x-p");

    // 【2. 路由逻辑】
    
    // A. 公开阅读接口 (无需密码)
    if (u.pathname === "/api/get" && id) {
      const data = await DB.get(id);
      if (!data) return new Response(JSON.stringify({t:"未找到", c:"内容已焚毁或不存在"}), { headers: { "Content-Type": "application/json" } });
      return new Response(data, { headers: { "Content-Type": "application/json" } });
    }

    // B. 管理员私有接口 (必须校验密码)
    if (u.pathname.startsWith("/api/admin/")) {
      if (!pass || pass !== P) {
        return new Response("Forbidden: Invalid Credentials", { status: 403 });
      }
      
      // 列表获取
      if (u.pathname === "/api/admin/list") {
        const { keys, list_complete, cursor: nextCursor } = await DB.list({ limit: 20, cursor });
        const list = await Promise.all(keys.map(async k => {
          const val = await DB.get(k.name);
          const v = JSON.parse(val || "{}");
          return { id: k.name, t: v.t || "无题", d: v.d || "" };
        }));
        return new Response(JSON.stringify({ list, nextCursor, complete: list_complete }));
      }
      
      // 保存笔记
      if (u.pathname === "/api/admin/save") {
        const body = await event.request.json();
        const nid = body.id || crypto.randomUUID().split('-')[0];
        const payload = JSON.stringify({ t: body.t || "无题", c: body.c || "", d: new Date().toLocaleDateString() });
        await DB.put(nid, payload);
        return new Response(JSON.stringify({ id: nid }));
      }

      // 删除笔记
      if (u.pathname === "/api/admin/del" && id) {
        await DB.delete(id);
        return new Response(JSON.stringify({ success: true }));
      }
    }

    // C. 页面渲染
    if (id) {
      return new Response(renderReader(), { headers: { "Content-Type": "text/html;charset=utf-8" } });
    }
    return new Response(renderAdmin(), { headers: { "Content-Type": "text/html;charset=utf-8" } });

  } catch (err) {
    return new Response("系统波动: " + err.message, { status: 500 });
  }
}

// ====== 视图 A：阅读页 (宣纸质感) ======
function renderReader() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>拾遗</title><script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script><style>body{margin:0;background:#f9f7f2;color:#2c2c2c;font-family:system-ui,-apple-system,sans-serif;display:flex;justify-content:center}article{width:90%;max-width:800px;padding-bottom:80px}.header-wrapper{position:sticky;top:0;background:rgba(249,247,242,0.9);backdrop-filter:blur(10px);padding:40px 0 20px 0;z-index:10;border-bottom:1px solid rgba(0,0,0,0.03)}h1{font-size:36px;margin:0;color:#1a1a1a;line-height:1.2}#date{font-size:12px;color:#8e8b82;margin-top:10px}#content{line-height:2;font-size:19px;word-break:break-word;padding-top:40px}#content pre{background:#f1eee6;padding:20px;overflow-x:auto;border-radius:8px}.f{margin-top:100px;border-top:1px solid #eee;padding-top:20px;font-size:12px;color:#8e8b82;text-align:center}</style></head><body><article><div class="header-wrapper"><h1 id="t"></h1><div id="date"></div></div><div id="content"></div><div class="f">—— 拾遗 · 完满 ——</div></article><script>const tid=new URLSearchParams(window.location.search).get('id');fetch('/api/get?id='+tid).then(r=>r.json()).then(d=>{document.getElementById('t').innerText=d.t;document.getElementById('date').innerText=d.d||'';document.getElementById('content').innerHTML=marked.parse(d.c);document.title=d.t;});</script></body></html>`;
}

// ====== 视图 B：工作台 (全功能集成) ======
function renderAdmin() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>工作台</title><script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script><style>:root{--top-bg:#2b466b;--side-bg:#fff;--work-bg:#f9f7f2;--text:#2c2c2c}body{margin:0;font-family:system-ui,sans-serif;height:100vh;display:flex;flex-direction:column;overflow:hidden;color:var(--text)}header{background:var(--top-bg);height:50px;display:flex;align-items:center;justify-content:space-between;padding:0 25px;color:white;flex-shrink:0;z-index:100}#lock{position:fixed;inset:0;background:var(--work-bg);z-index:999;display:flex;align-items:center;justify-content:center}.login-box{background:white;padding:40px;border-radius:12px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.1)}.container{flex:1;display:flex;overflow:hidden}aside{width:260px;background:var(--side-bg);border-right:1px solid #eee;display:flex;flex-direction:column}#ls{flex:1;overflow-y:auto;padding:10px}.item{padding:12px 15px;cursor:pointer;border-radius:6px;font-size:14px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center}.active{background:var(--work-bg);font-weight:bold}main{flex:1;background:var(--work-bg);display:flex;flex-direction:column;position:relative}#t{border:none;background:transparent;outline:none;font-size:30px;font-weight:700;margin:30px 30px 0 30px}.edit-area{display:flex;flex:1;gap:20px;padding:30px;overflow:hidden}textarea{flex:1.2;border:none;background:rgba(255,255,255,0.4);padding:25px;border-radius:12px;outline:none;font-size:18px;line-height:1.6;resize:none}#pre{flex:1;overflow-y:auto;font-size:18px;line-height:1.6;padding:10px}.btn{cursor:pointer;padding:6px 15px;border-radius:4px;border:1px solid rgba(255,255,255,0.3);background:transparent;color:#fff;font-size:12px;margin-left:10px}.save-btn{background:#fff;color:var(--top-bg);border:none;font-weight:bold}.del-btn{color:#ccacac;font-size:12px;cursor:pointer}.stat{position:absolute;bottom:15px;right:30px;font-size:12px;color:#bbb}</style></head><body>
  <div id="lock"><div class="login-box"><div style="opacity:0.4;font-size:12px;margin-bottom:20px;letter-spacing:2px">拾遗 · OWNER</div><input type="password" id="pw" placeholder="密码" style="text-align:center;border:none;border-bottom:1px solid #000;width:180px;outline:none;font-size:18px;padding:10px;margin-bottom:20px"><br><button onclick="login()" style="background:#2b466b;color:white;border:none;padding:8px 40px;border-radius:4px;cursor:pointer">进入</button></div></div>
  <header><div>拾遗.</div><div><span class="btn" onclick="copyLink()">分享链接</span><button class="btn save-btn" id="sb" onclick="save()">存档 (Ctrl+S)</button></div></header>
  <div class="container"><aside><div id="ls"></div><div onclick="newN()" style="padding:20px;text-align:center;cursor:pointer;color:#888;border-top:1px solid #f5f5f5;font-size:13px">+ 开启新篇</div></aside><main><input id="t" placeholder="无题"><div class="edit-area"><textarea id="c" placeholder="在此落笔..." oninput="onI()"></textarea><div id="pre"></div></div><div class="stat" id="st">字数: 0</div></main></div>
  <script>
    let p=localStorage.getItem('拾遗_P')||"",cur=null; const $=id=>document.getElementById(id);
    window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();save()}});
    const api=async(u,m="GET",b=null)=>{const r=await fetch(u,{headers:{"x-p":p,"Content-Type":"application/json"},method:m,body:b?JSON.stringify(b):null});if(r.status===403)return alert("密码错误");return r.json()};
    async function login(){p=$('pw').value||p; const d=await api("/api/admin/list"); if(d){localStorage.setItem('拾遗_P',p);$('lock').style.display="none";renderL(d.list)}}
    function renderL(items){$('ls').innerHTML=items.map(n=>\`<div class="item \${cur===n.id?'active':''}" onclick="loadN('\${n.id}')"><span>\${n.t}</span><span class="del-btn" onclick="delN(event,'\${n.id}')">✕</span></div>\`).join('')}
    async function loadN(id){cur=id; const d=await fetch('/api/get?id='+id).then(r=>r.json());$('t').value=d.t;$('c').value=d.c;onI();Array.from(document.querySelectorAll('.item')).forEach(el=>el.classList.remove('active'))}
    async function save(){const d=await api("/api/admin/save","POST",{t:$('t').value||"无题",c:$('c').value,id:cur});if(d){cur=d.id; $('sb').innerText="已存档"; setTimeout(()=>$('sb').innerText="存档 (Ctrl+S)",1000); login()}}
    async function delN(e,id){e.stopPropagation();if(confirm("焚毁此篇？")){await api("/api/admin/del?id="+id,"POST");if(cur===id)newN();login()}}
    function onI(){$('pre').innerHTML=marked.parse($('c').value||"");$('st').innerText="字数: "+$('c').value.length}
    function newN(){cur=null;$('t').value="";$('c').value="";onI();$('t').focus()}
    function copyLink(){if(!cur)return alert("请先存档");navigator.clipboard.writeText(window.location.origin+"?id="+cur);alert("链接已复制")}
    $('pw').addEventListener('keypress',e=>{if(e.key==='Enter')login()}); if(p)login();
  </script></body></html>`;
}
