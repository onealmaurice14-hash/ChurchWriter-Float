const C = window.APP_CONFIG || {};
const Store = (() => {
  if (C.SUPABASE_URL && !C.SUPABASE_URL.startsWith("YOUR")) {
    const sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
    return { sb, live: true,
      async add(png) { const { error } = await sb.from("messages").insert({ png }); if (error) throw error; },
      async list(n = 40) { const { data } = await sb.from("messages").select("id,png").order("created_at", { ascending: false }).limit(n); return (data || []).reverse(); },
      onInsert(cb) { sb.channel("ins").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, p => cb(p.new)).subscribe(); },
      onDelete(cb) { sb.channel("del").on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, p => cb(p.old)).subscribe(); },
      async remove(id) { await sb.from("messages").delete().eq("id", id); } };
  }
  const bc = new BroadcastChannel("bia"), K = "bia_msgs";
  const get = () => JSON.parse(localStorage.getItem(K) || "[]");
  const put = a => localStorage.setItem(K, JSON.stringify(a.slice(-60)));
  return { live: false,
    async add(png) { const m = { id: Date.now() + "" + Math.random(), png }; put([...get(), m]); bc.postMessage({ t: "ins", m }); },
    async list(n = 40) { return get().slice(-n); },
    onInsert(cb) { bc.addEventListener("message", e => e.data.t === "ins" && cb(e.data.m)); },
    onDelete(cb) { bc.addEventListener("message", e => e.data.t === "del" && cb({ id: e.data.id })); },
    async remove(id) { put(get().filter(m => m.id !== id)); bc.postMessage({ t: "del", id }); } };
})();
