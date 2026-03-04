/**
 * 拾遗 · 雅集完全融合版 (GitHub 环境变量安全版)
 */

const DB_BINDING = 'JIANDAN_NOTES'; // 对应你在 KV 绑定时填写的变量名
const PAGE_SIZE = 15;

export default {
  async fetch(request, env) {
    const DB = env[DB_BINDING];
    const P = env.PASSWORD; // 从环境变量获取密码

    // 基础检查
    if (!DB) return new Response("错误: 请在 Cloudflare 后台绑定 KV 命名空间，变量名为 JIANDAN_NOTES", { status: 500 });
    if (!P) return new Response("错误: 请在 Cloudflare 后台设置环境变量 PASSWORD", { status: 500 });

    const u = new URL(request.url);
    const id = u.searchParams.get("id");
    const cursor = u.searchParams.get("cursor") || "";
    const pass = request.headers.get("x-p");

    // 1. 公开阅读接口
    if (u.pathname === "/api/get" && id) {
      const data = await DB.get(id);
      return new Response(data, { headers: { "Content-Type": "application/json" } });
    }

    // 2. 管理员私有接口
    if (u.pathname.startsWith("/api/admin/")) {
      if (pass !== P) return new Response("Forbidden", { status: 403 });
      
      // 获取列表
      if (u.pathname === "/api/admin/list") {
        const { keys, list_complete, cursor: nextCursor } = await DB.list({ limit: PAGE_SIZE, cursor });
        const list = await Promise.all(keys.map(async k => {
          const v = JSON.parse(await DB.get(k.name) || "{}");
          return { id: k.name, t: v.t || "无题", d: v.d || "" };
        }));
        return new Response(JSON.stringify({ list, nextCursor, complete: list_complete }));
      }
      
      // 保存
      if (u.pathname === "/api/admin/save") {
        const { t, c, id: editId } = await request.json();
        const nid = editId || crypto.randomUUID().split('-')[0];
        const payload = JSON.stringify({ t, c, d: new Date().toLocaleDateString() });
        await DB.put(nid, payload);
        return new Response(JSON.stringify({ id: nid }));
      }

      // 删除
      if (u.pathname === "/api/admin/del" && id) {
        await DB.delete(id);
        return new Response(JSON.stringify({ success: true }));
      }
    }

    // 3. 页面渲染逻辑
    if (id) return new Response(renderReader(), { headers: { "Content-Type": "text/html;charset=utf-8" } });
    return new Response(renderAdmin(), { headers: { "Content-Type": "text/html;charset=utf-8" } });
  }
};

// ====== 视图 A：阅读者页面 (标题固定，宣纸质感) ======
function renderReader() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>拾遗</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    body { margin: 0; background: #f9f7f2; color: #2c2c2c; font-family: system-ui, -apple-system, "PingFang SC", sans-serif; display: flex; justify-content: center; }
    article { width: 90%; max-width: 800px; padding-bottom: 80px; }
    .header-wrapper { position: sticky; top: 0; background: rgba(249, 247, 242, 0.9); backdrop-filter: blur(10px); padding: 40px 0 20px 0; z-index: 10; border-bottom: 1px solid rgba(0,0,0,0.03); }
    h1 { font-size: 36px; margin: 0; color: #1a1a1a; letter-spacing: -0.5px; line-height: 1.2; }
    #date { font-size: 12px; color: #8e8b82; margin-top: 10px; letter-spacing: 1px; }
    #content { line-height: 2; font-size: 19px; word-break: break-word; padding-top: 40px; }
    #content code { background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 4px; font-size: 90%; }
    #content pre { background: #f1eee6; padding: 20px; overflow-x: auto; border-radius: 8px; }
    .f { margin-top: 100px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #8e8b82; text-align: center; letter-spacing: 2px; }
  </style></head>
  <body><article><div class="header-wrapper"><h1 id="t"></h1><div id="date"></div></div><div id="content"></div><div class="f">—— 拾遗 · 完满 ——</div></article>
  <script>
    const tid = new URLSearchParams(window.location.search).get('id');
    fetch('/api/get?id=' + tid).then(r => r.json()).then(d => {
      document.getElementById('t').innerText = d.t;
      document.getElementById('date').innerText = d.d || '';
      document.getElementById('content').innerHTML = marked.parse(d.c);
      document.title = d.t;
    });
  </script></body></html>`;
}

// ====== 视图 B：笔主工作台 (三色布局，功能全集成) ======
function renderAdmin() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>工作台</title><script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script><style>
    :root { --top-bg: #2b466b; --side-bg: #ffffff; --work-bg: #f9f7f2; --text: #2c2c2c; }
    body { margin: 0; font-family: system-ui, sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; color: var(--text); }
    header { background: var(--top-bg); height: 50px; display: flex; align-items: center; justify-content: space-between; padding: 0 25px; color: white; flex-shrink: 0; z-index: 100; box-shadow: 0 1px 10px rgba(0,0,0,0.2); }
    .container { flex: 1; display: flex; overflow: hidden; }
    aside { width: 260px; background: var(--side-bg); border-right: 1px solid #eee; display: flex; flex-direction: column; flex-shrink: 0; }
    .list { flex: 1; overflow-y: auto; padding: 10px; scrollbar-width: none; }
    .item { padding: 12px 15px; cursor: pointer; border-radius: 6px; font-size: 14px; margin-bottom: 5px; color: #555; border: 1px solid transparent; display: flex; justify-content: space-between; align-items: center; }
    .active { background: var(--work-bg); border-color: #e0ddd5; font-weight: bold; color: var(--text); }
    .del-icon { opacity: 0; color: #ccacac; font-size: 12px; }
    .item:hover .del-icon { opacity: 1; }
    main { flex: 1; background: var(--work-bg); display: flex; flex-direction: column; overflow: hidden; position: relative; }
    .editor-container { width: 95%; max-width: 1400px; margin: 0 auto; padding: 30px 0; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }
    #t { border: none; background: transparent; outline: none; font-size: 34px; font-weight: 700; margin-bottom: 20px; color: #1a1a1a; width: 100%; padding: 0 10px; }
    .content-split { display: flex; flex: 1; gap: 40px; padding: 10px; overflow: hidden; }
    textarea { flex: 1.2; border: none; background: rgba(255,255,255,0.4); padding: 30px; border-radius: 12px; outline: none; font-size: 18px; line-height: 1.8; resize: none; font-family: inherit; color: var(--text); box-shadow: inset 0 0 15px rgba(0,0,0,0.03); }
    #pre { flex: 1; line-height: 1.8; font-size: 18px; padding: 10px 30px; overflow-y: auto; }
    .btn { cursor: pointer; font-size: 12px; padding: 6px 15px; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; background: rgba(255,255,255,0.1); color: white; }
    .save-btn { background: #fff; color: var(--top-bg); border: none; font-weight: bold; margin-left: 10px; }
    #lock { position: fixed; inset: 0; background: var(--work-bg); z-index: 999; display: flex; align-items: center; justify-content: center; }
    .login-box { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    .stat-bar { position: absolute; bottom: 15px; right: 40px; font-size: 10px; color: #bbb; pointer-events: none; }
  </style></head>
  <body>
  <div id="lock"><div class="login-box"><div style="opacity:0.4;font-size:12px;margin-bottom:20px;letter-spacing:2px">拾遗 · OWNER</div><input type="password" id="pw" placeholder="密码" style="text-align:center;border:none;border-bottom:1px solid #000;width:180px;outline:none;font-size:18px;padding:10px;margin-bottom:20px"><br><button onclick="login()" style="background:#2b466b;color:white;border:none;padding:8px 40px;border-radius:4px;cursor:pointer">进入</button></div></div>
  <header><div style="font-weight:900;letter-spacing:2px">拾遗.</div><div><span class="btn" onclick="copyLink()">分享链接</span><button id="save-btn" class="btn save-btn" onclick="save()">存档 (Ctrl+S)</button></div></header>
  <div class="container">
    <aside><div class="list" id="ls"></div><div id="more" style="text-align:center;padding:10px;font-size:11px;color:#bbb;cursor:pointer" onclick="loadL()">加载更多...</div><div onclick="newN()" style="padding:20px;text-align:center;font-size:12px;border-top:1px solid #f5f5f5;cursor:pointer;color:#888;font-weight:bold">+ 开启新篇</div></aside>
    <main><div class="editor-container"><input id="t" placeholder="无题"><div class="content-split"><textarea id="c" placeholder="在此落笔..." oninput="onInput()"></textarea><div id="pre"></div></div></div><div class="stat-bar" id="stat">字数: 0</div></main>
  </div>
  <script>
    let p = localStorage.getItem('拾遗_P') || "", cur = null, nextCursor = "";
    const $ = id => document.getElementById(id);
    window.addEventListener('keydown', e => { if((e.ctrlKey || e.metaKey) && e.key === 's'){ e.preventDefault(); save(); } });
    $('pw').addEventListener('keypress', e => { if(e.key === 'Enter') login(); });
    async function api(u, m="GET", b=null) {
      const r = await fetch(u, { headers: { "x-p": p, "Content-Type": "application/json" }, method: m, body: b ? JSON.stringify(b) : null });
      if(r.status === 403) { alert("密码错误"); return null; }
      return r.json();
    }
    async function login() { 
      p = $("pw").value || p; const d = await api("/api/admin/list"); 
      if(d) { localStorage.setItem('拾遗_P', p); renderL(d.list, true); nextCursor = d.nextCursor; $("lock").style.display="none"; if(d.complete) $("more").style.display="none"; } 
    }
    async function loadL(clear=false) {
      const d = await api("/api/admin/list?cursor=" + (clear?"":nextCursor));
      if(d) { renderL(d.list, clear); nextCursor = d.nextCursor; $("more").style.display = d.complete ? "none" : "block"; }
    }
    function renderL(items, clear) { 
      const html = items.map(n=>\`<div class="item \${cur===n.id?'active':''}" id="i-\${n.id}" onclick="loadN('\${n.id}')"><span>\${n.t}</span><span class="del-icon" onclick="delN(event,'\${n.id}')">✕</span></div>\`).join('');
      if(clear) $("ls").innerHTML = html; else $("ls").innerHTML += html;
    }
    async function save() {
      const d = await api("/api/admin/save", "POST", { t: $("t").value||"无题", c: $("c").value, id: cur });
      if(d) { cur = d.id; const btn = $("save-btn"); btn.innerText = "已保存"; setTimeout(()=>{ btn.innerText = "存档 (Ctrl+S)"; }, 1000); loadL(true); } 
    }
    async function delN(e, id) { e.stopPropagation(); if(confirm("焚毁此篇？")) { await api("/api/admin/del?id="+id, "POST"); if(cur===id) newN(); loadL(true); } }
    async function loadN(id) {
      cur = id; const d = await fetch('/api/get?id='+id).then(r=>r.json());
      $("t").value = d.t; $("c").value = d.c; onInput();
      document.querySelectorAll('.item').forEach(el=>el.classList.remove('active')); document.getElementById('i-'+id)?.classList.add('active');
    }
    function onInput() { $("pre").innerHTML = marked.parse($("c").value || ""); $("stat").innerText = "字数: " + $("c").value.length; }
    function newN() { cur = null; $("t").value = ""; $("c").value = ""; onInput(); $("t").focus(); }
    function copyLink() { if(!cur) return alert("请先存档"); navigator.clipboard.writeText(window.location.origin + "?id=" + cur); alert("分享链接已复制"); }
    if(p) { login(); }
  </script></body></html>`;
}