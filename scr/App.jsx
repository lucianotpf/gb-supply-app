import { useState, useEffect } from "react";

const GBWEAR_CATEGORIES = {
  gbWear: {
    label: "GB Wear",
    accent: "#c0392b",
    sections: [
      { name: "GB1 GI Adulto (White)", items: ["A0","A1","A2","A3","A4","A5"] },
      { name: "Training Tee Adulto", items: ["XS","S","M","L","XL","2XL","3XL"] },
      { name: "White Rashguard", items: ["XS","S","M","L","XL","2XL","3XL"] },
      { name: "Blue Rashguard", items: ["XS","S","M","L","XL","2XL","3XL"] },
      { name: "No-Gi Shorts Adulto", items: ["28","30","32","34","36","38","40","42","44"] },
      { name: "Kids White GI", items: ["Y0","Y1","Y2","Y3","Y4","Y5","Y6"] },
      { name: "Kids Blue GI", items: ["Y0","Y1","Y2","Y3","Y4","Y5","Y6"] },
      { name: "Kids Pink GI", items: ["Y0","Y1","Y2","Y3","Y4","Y5","Y6"] },
      { name: "Kids Training Tee", items: ["YXS","YS","YM","YL"] },
      { name: "Kids No-Gi Shorts", items: ["YXS","YS","YM","YL"] },
    ],
  },
};

const SUPPLY_CATEGORIES = {
  frontDesk: {
    label: "Front Desk",
    accent: "#27ae60",
    sections: [
      { name: "Stripe", items: ["(White)","(Red)","(Black)"] },
      { name: "Escritório", items: ["Printer Paper","Printer Ink","Laminating Sheets","Sharpie (Black)","Sharpie (Red)","Dry Erase Pen"] },
      { name: "Primeiros Socorros & Misc", items: ["Nail Polish Remover","Band Aid","Hydrogen Peroxide","Ice Packs","Essential Oil","Coffee Cup","Coffee Pods"] },
    ],
  },
  hygiene: {
    label: "Higiene / Banheiro",
    accent: "#8e44ad",
    sections: [
      { name: "Banheiro", items: ["Toilet Paper","Paper Towel","Toilet Cover","Hand Towel","Hand Soap","Clorox","Lysol Toilet","Windex","Swiffer Pads","Hand Sanitizer","Mat Cleaner","Air Mist Spray","Mop Pads","Trash Bag"] },
    ],
  },
  fridge: {
    label: "Fridge",
    accent: "#2980b9",
    sections: [
      { name: "Geladeira", items: ["Water","Coconut Water","Protein","Gatorade"] },
    ],
  },
  misc: {
    label: "Misc",
    accent: "#e67e22",
    sections: [
      { name: "Miscellaneous", items: ["Stickers","Welcome Booklet","150 Days Certificate"] },
    ],
  },
};

const ALL_TABS = { ...GBWEAR_CATEGORIES, ...SUPPLY_CATEGORIES };

const makeKey = (cat, sec, item) => `${cat}__${sec}__${item}`;
const pad = (n) => String(n).padStart(3, "0");

function getNextOrderNumber() {
  try {
    const saved = localStorage.getItem("gb_order_counter");
    const next = saved ? parseInt(saved) + 1 : 1;
    localStorage.setItem("gb_order_counter", String(next));
    return pad(next);
  } catch { return pad(1); }
}

function getOrderHistory() {
  try { return JSON.parse(localStorage.getItem("gb_order_history") || "[]"); }
  catch { return []; }
}

function saveOrderToHistory(order) {
  try {
    const history = getOrderHistory();
    history.unshift(order);
    localStorage.setItem("gb_order_history", JSON.stringify(history.slice(0, 50)));
  } catch {}
}

export default function SupplyOrder() {
  const [quantities, setQuantities] = useState({});
  const [activeTab, setActiveTab] = useState("gbWear");
  const [submitted, setSubmitted] = useState(false);
  const [notes, setNotes] = useState("");
  const [orderNumber, setOrderNumber] = useState(null);
  const [orderDate, setOrderDate] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (showHistory) setHistory(getOrderHistory());
  }, [showHistory]);

  const setQty = (key, val) => {
    const n = Math.max(0, parseInt(val) || 0);
    setQuantities((prev) => ({ ...prev, [key]: n }));
  };

  const buildLines = (catKeys) =>
    Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => {
        const [cat, sec, item] = key.split("__");
        if (!catKeys.includes(cat)) return null;
        return { cat, category: ALL_TABS[cat]?.label, section: sec, item, qty };
      })
      .filter(Boolean);

  const gbLines = buildLines(Object.keys(GBWEAR_CATEGORIES));
  const supplyLines = buildLines(Object.keys(SUPPLY_CATEGORIES));
  const allLines = [...gbLines, ...supplyLines];
  const total = allLines.reduce((s, l) => s + l.qty, 0);

  const handleSubmit = () => {
    const num = getNextOrderNumber();
    const date = new Date().toLocaleDateString("pt-BR");
    setOrderNumber(num);
    setOrderDate(date);
    saveOrderToHistory({ number: num, date, gbLines, supplyLines, notes, total });
    setSubmitted(true);
  };

  const buildWhatsAppMsg = (lines, type) => {
    const title = type === "gb" ? "GB WEAR" : "SUPPLY (School)";
    let msg = `📋 *PEDIDO ${title} — #${orderNumber}*\n📅 ${orderDate}\n${"━".repeat(24)}\n`;
    const grouped = {};
    lines.forEach((l) => {
      if (!grouped[l.section]) grouped[l.section] = [];
      grouped[l.section].push(l);
    });
    Object.entries(grouped).forEach(([sec, items]) => {
      msg += `\n*${sec}*\n`;
      items.forEach((l) => { msg += `▪️ ${l.item} — *${l.qty} un*\n`; });
    });
    const subtotal = lines.reduce((s, l) => s + l.qty, 0);
    msg += `\n${"━".repeat(24)}\n✅ *Total: ${subtotal} unidades*`;
    if (notes) msg += `\n\n📝 *Obs:* ${notes}`;
    return msg;
  };

  const sendWhatsApp = (type) => {
    const lines = type === "gb" ? gbLines : supplyLines;
    if (lines.length === 0) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppMsg(lines, type))}`, "_blank");
  };

  const resetAll = () => {
    setQuantities({});
    setSubmitted(false);
    setNotes("");
    setOrderNumber(null);
    setOrderDate("");
  };

  const resetHistory = () => {
    try {
      localStorage.removeItem("gb_order_history");
      localStorage.removeItem("gb_order_counter");
    } catch {}
    setHistory([]);
    setConfirmReset(false);
  };

  const tabKeys = Object.keys(ALL_TABS);

  // ── HISTORY VIEW ──
  if (showHistory) {
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f0f4f8", minHeight: "100vh" }}>
        <div style={{ background: "#1a3a5c", color: "white", padding: "20px 24px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => { setShowHistory(false); setConfirmReset(false); }}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700 }}>
              ← Voltar
            </button>
            <div style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>Histórico de Pedidos</div>
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)}
                style={{ background: "rgba(192,57,43,0.8)", border: "none", color: "white", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                🗑️ Zerar Tudo
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={resetHistory}
                  style={{ background: "#c0392b", border: "none", color: "white", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  ✓ Confirmar
                </button>
                <button onClick={() => setConfirmReset(false)}
                  style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {confirmReset && (
          <div style={{ background: "#fdecea", borderLeft: "4px solid #c0392b", margin: "16px auto", maxWidth: 768, borderRadius: 8, padding: "12px 16px" }}>
            <div style={{ fontWeight: 700, color: "#c0392b", marginBottom: 4 }}>⚠️ Tem certeza?</div>
            <div style={{ fontSize: 13, color: "#555" }}>Isso vai apagar todo o histórico e reiniciar a numeração do zero (#001). Não tem como desfazer.</div>
          </div>
        )}

        <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px" }}>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", padding: 48, fontSize: 15 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              Nenhum pedido ainda.
            </div>
          ) : history.map((o, i) => (
            <div key={i} style={{ background: "white", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: "#1a3a5c", fontSize: 16 }}>Pedido #{o.number}</span>
                <span style={{ color: "#888", fontSize: 13 }}>{o.date}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {o.gbLines?.length > 0 && (
                  <span style={{ background: "#fdecea", color: "#c0392b", borderRadius: 6, padding: "3px 10px", fontWeight: 600, fontSize: 13 }}>
                    🥋 GB Wear: {o.gbLines.reduce((s,l)=>s+l.qty,0)} un
                  </span>
                )}
                {o.supplyLines?.length > 0 && (
                  <span style={{ background: "#eafaf1", color: "#27ae60", borderRadius: 6, padding: "3px 10px", fontWeight: 600, fontSize: 13 }}>
                    🏫 Supply: {o.supplyLines.reduce((s,l)=>s+l.qty,0)} un
                  </span>
                )}
              </div>
              {o.notes && <div style={{ marginTop: 8, fontSize: 12, color: "#888", fontStyle: "italic" }}>📝 {o.notes}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── SUMMARY VIEW ──
  if (submitted) {
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f0f4f8", minHeight: "100vh" }}>
        <div style={{ background: "#1a3a5c", color: "white", padding: "20px 24px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>GRACIE BARRA</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Pedido #{orderNumber}</div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>{orderDate}</div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px" }}>
          {/* GB Wear block */}
          <div style={{ background: "white", borderRadius: 12, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ background: "#c0392b", color: "white", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>🥋 GB Wear</span>
              <span style={{ fontSize: 13, opacity: 0.9 }}>{gbLines.reduce((s,l)=>s+l.qty,0)} unidades</span>
            </div>
            {gbLines.length === 0 ? (
              <div style={{ padding: 16, color: "#aaa", fontSize: 14 }}>Nenhum item de GB Wear.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <tbody>
                  {gbLines.map((l, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "9px 16px", color: "#555", fontSize: 12 }}>{l.section}</td>
                      <td style={{ padding: "9px 16px", fontWeight: 600 }}>{l.item}</td>
                      <td style={{ padding: "9px 16px", textAlign: "right", fontWeight: 700, color: "#c0392b" }}>{l.qty} un</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f5f5f5" }}>
              <button onClick={() => sendWhatsApp("gb")} disabled={gbLines.length === 0}
                style={{ width: "100%", background: gbLines.length > 0 ? "#25D366" : "#ccc", color: "white", border: "none", borderRadius: 10, padding: "13px", fontWeight: 700, fontSize: 15, cursor: gbLines.length > 0 ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>📲</span> Enviar GB Wear pelo WhatsApp
              </button>
            </div>
          </div>

          {/* Supply block */}
          <div style={{ background: "white", borderRadius: 12, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ background: "#27ae60", color: "white", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>🏫 Supply (School)</span>
              <span style={{ fontSize: 13, opacity: 0.9 }}>{supplyLines.reduce((s,l)=>s+l.qty,0)} unidades</span>
            </div>
            {supplyLines.length === 0 ? (
              <div style={{ padding: 16, color: "#aaa", fontSize: 14 }}>Nenhum item de supply.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <tbody>
                  {supplyLines.map((l, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "9px 16px", color: "#555", fontSize: 12 }}>{l.section}</td>
                      <td style={{ padding: "9px 16px", fontWeight: 600 }}>{l.item}</td>
                      <td style={{ padding: "9px 16px", textAlign: "right", fontWeight: 700, color: "#27ae60" }}>{l.qty} un</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f5f5f5" }}>
              <button onClick={() => sendWhatsApp("supply")} disabled={supplyLines.length === 0}
                style={{ width: "100%", background: supplyLines.length > 0 ? "#25D366" : "#ccc", color: "white", border: "none", borderRadius: 10, padding: "13px", fontWeight: 700, fontSize: 15, cursor: supplyLines.length > 0 ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>📲</span> Enviar Supply pelo WhatsApp
              </button>
            </div>
          </div>

          {notes && (
            <div style={{ background: "#fff8e1", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e67e22", marginBottom: 4 }}>OBSERVAÇÕES</div>
              <div style={{ fontSize: 14, color: "#444" }}>{notes}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={resetAll}
              style={{ flex: 1, background: "#1a3a5c", color: "white", border: "none", borderRadius: 10, padding: "13px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              ← Novo Pedido
            </button>
            <button onClick={() => setShowHistory(true)}
              style={{ background: "white", color: "#1a3a5c", border: "2px solid #1a3a5c", borderRadius: 10, padding: "13px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              📂 Histórico
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM VIEW ──
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f0f4f8", minHeight: "100vh" }}>
      <div style={{ background: "#1a3a5c", color: "white", padding: "20px 24px 0", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "#c0392b", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📋</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>GRACIE BARRA</div>
              <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 2, textTransform: "uppercase" }}>Supply Order Form</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              {total > 0 && <div style={{ background: "#c0392b", borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 700 }}>{total} itens</div>}
              <button onClick={() => setShowHistory(true)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>
                📂
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
            {tabKeys.map((key) => {
              const isGb = !!GBWEAR_CATEGORIES[key];
              const accent = isGb ? "#c0392b" : "#27ae60";
              const isActive = activeTab === key;
              return (
                <button key={key} onClick={() => setActiveTab(key)} style={{
                  background: isActive ? "white" : "transparent",
                  color: isActive ? (isGb ? "#c0392b" : "#27ae60") : "rgba(255,255,255,0.7)",
                  border: "none", borderRadius: "8px 8px 0 0",
                  padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
                  borderBottom: isActive ? `3px solid ${accent}` : "3px solid transparent",
                }}>
                  {isGb ? "🥋 " : "🏫 "}{ALL_TABS[key].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px" }}>
        {ALL_TABS[activeTab].sections.map((sec) => (
          <div key={sec.name} style={{ background: "white", borderRadius: 12, marginBottom: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ background: ALL_TABS[activeTab].accent, color: "white", padding: "10px 16px", fontSize: 13, fontWeight: 700 }}>
              {sec.name}
            </div>
            {sec.items.map((item) => {
              const key = makeKey(activeTab, sec.name, item);
              const qty = quantities[key] || 0;
              return (
                <div key={item} style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #f5f5f5", gap: 12 }}>
                  <div style={{ flex: 1, fontSize: 14, color: qty > 0 ? "#1a3a5c" : "#444", fontWeight: qty > 0 ? 600 : 400 }}>{item}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setQty(key, qty - 1)} disabled={qty === 0}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid #ddd", background: "#f8f8f8", cursor: qty > 0 ? "pointer" : "default", fontSize: 18, color: "#555", fontWeight: 700 }}>−</button>
                    <input type="number" min={0} value={qty === 0 ? "" : qty} placeholder="0" onChange={(e) => setQty(key, e.target.value)}
                      style={{ width: 44, textAlign: "center", fontSize: 15, fontWeight: 700, border: "1.5px solid #ddd", borderRadius: 8, padding: "4px 0", color: qty > 0 ? ALL_TABS[activeTab].accent : "#aaa" }} />
                    <button onClick={() => setQty(key, qty + 1)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: ALL_TABS[activeTab].accent, cursor: "pointer", fontSize: 18, color: "white", fontWeight: 700 }}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div style={{ background: "white", borderRadius: 12, padding: 16, marginTop: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a3a5c", marginBottom: 8 }}>Observações</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alguma observação sobre o pedido..." rows={3}
            style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 8, padding: "10px 12px", fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
          <div style={{ flex: 1, fontSize: 13, color: "#888" }}>
            {total > 0
              ? <><span style={{ color: "#1a3a5c", fontWeight: 700 }}>{total} unidades</span> · {allLines.length} tipos</>
              : "Nenhum item selecionado"}
          </div>
          <button onClick={handleSubmit} disabled={allLines.length === 0} style={{
            background: allLines.length > 0 ? "#c0392b" : "#ddd", color: "white", border: "none",
            borderRadius: 10, padding: "14px 28px", fontWeight: 700, fontSize: 15,
            cursor: allLines.length > 0 ? "pointer" : "default",
          }}>
            Concluir Pedido →
          </button>
        </div>
      </div>
    </div>
  );
}
