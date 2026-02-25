import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  sand: "#F5EFE0",
  terracotta: "#C8573A",
  deep: "#1A1208",
  olive: "#6B7A3A",
  warm: "#E8C89A",
  mist: "#D4C9B8",
};

const BG_GRADIENTS = [
  "linear-gradient(135deg,#FFF5EC,#FFECD8)",
  "linear-gradient(135deg,#EBF5E8,#D9F0D2)",
  "linear-gradient(135deg,#EBF0F5,#D6E8F5)",
  "linear-gradient(135deg,#F5EBEE,#F5D6DE)",
  "linear-gradient(135deg,#F5F0EB,#EDE0D4)",
  "linear-gradient(135deg,#EEF5EB,#DFF5D6)",
];

const QUICK_TAGS = [
  { label: "🌍 Africa", value: "Africa" },
  { label: "🗾 Japan", value: "Japan" },
  { label: "🏔️ Patagonia", value: "Patagonia" },
  { label: "🌊 Amalfi Coast", value: "Amalfi Coast" },
  { label: "🏝️ SE Asia", value: "Southeast Asia" },
  { label: "❄️ Iceland", value: "Iceland" },
];

const style = (obj) => obj;

function Spinner({ size = 40 }) {
  return (
    <div style={{ width: size, height: size, border: `3px solid ${C.mist}`, borderTopColor: C.terracotta, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
  );
}

function buildSearchPrompt(destination) {
  return `You are Trailure's AI travel curator. Generate 9 captivating, diverse travel experiences for: "${destination}".

Return ONLY a valid JSON object in this exact format (no markdown, no extra text):
{
  "destination": "Display name for ${destination}",
  "categories": ["Adventure", "Culture", "Food & Drink", "Nature", "Wellness", "Hidden Gems"],
  "experiences": [
    {
      "id": 1,
      "emoji": "🏔️",
      "title": "Experience name",
      "location": "Specific place within ${destination}",
      "category": "Adventure",
      "type": "Outdoor",
      "description": "2 sentence vivid description of why this is unmissable.",
      "tags": ["tag1", "tag2", "tag3"],
      "rating": 4.8,
      "price": "$120",
      "priceNote": "per person",
      "tailorOptions": [
        {"label": "Solo Explorer", "desc": "Best for solo travelers"},
        {"label": "Couple Retreat", "desc": "Perfect for two"},
        {"label": "Family Adventure", "desc": "Great with kids"},
        {"label": "Group Trip", "desc": "Ideal for groups 4+"}
      ]
    }
  ]
}

Make experiences vivid, specific, authentic. Include a mix of: adventure, hidden gems, local food, cultural sites, nature, wellness. Vary prices ($30-$500). Make tailorOptions relevant to each experience type.`;
}

function buildRefinePrompt(experience, option) {
  return `You are Trailure's AI travel curator. A traveler chose "${experience.title}" in "${experience.location}" and wants "${option}" options.

Return ONLY valid JSON (no markdown):
{
  "results": [
    {
      "title": "Specific option name",
      "description": "2 sentence vivid description tailored for ${option} travelers.",
      "price": "$XX",
      "duration": "X hours",
      "highlight": "The one unmissable thing about this option"
    }
  ]
}

Generate 4 specific, distinct options for "${option}" travelers. Vary by budget, duration, and style.`;
}

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const text = data.content[0].text;
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── Detail Panel ────────────────────────────────────────────────────────────
function DetailPanel({ exp, onClose }) {
  const [selected, setSelected] = useState(null);
  const [refining, setRefining] = useState(false);
  const [refined, setRefined] = useState([]);

  async function refine() {
    if (!selected) return;
    setRefining(true);
    setRefined([]);
    try {
      const data = await callClaude(buildRefinePrompt(exp, selected));
      setRefined(data.results || []);
    } catch {
      setRefined([{ title: "Error", description: "Couldn't load options. Please try again.", price: "", duration: "", highlight: "" }]);
    }
    setRefining(false);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,18,8,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.sand, width: "100%", maxWidth: 640, borderRadius: "24px 24px 0 0", padding: "40px 36px 56px", maxHeight: "85vh", overflowY: "auto", position: "relative", animation: "slideUp 0.3s ease" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 20, width: 34, height: 34, borderRadius: "50%", border: "none", background: "white", cursor: "pointer", fontSize: "1rem", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

        <div style={{ fontSize: "3rem", marginBottom: 12 }}>{exp.emoji}</div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 4 }}>{exp.title}</div>
        <div style={{ fontSize: "0.82rem", color: "rgba(26,18,8,0.45)", marginBottom: 18 }}>📍 {exp.location} · {exp.category}</div>
        <div style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "rgba(26,18,8,0.65)", marginBottom: 28, fontWeight: 300 }}>{exp.description}</div>

        <div style={{ fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: C.terracotta, marginBottom: 14 }}>Tailor your experience</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {(exp.tailorOptions || []).map(opt => (
            <div key={opt.label} onClick={() => setSelected(opt.label)} style={{ background: "white", border: `2px solid ${selected === opt.label ? C.terracotta : C.mist}`, borderRadius: 14, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s", color: selected === opt.label ? C.terracotta : C.deep }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>{opt.label}</div>
              <div style={{ fontSize: "0.76rem", color: selected === opt.label ? "rgba(200,87,58,0.6)" : "rgba(26,18,8,0.4)" }}>{opt.desc}</div>
            </div>
          ))}
        </div>

        <button onClick={refine} disabled={!selected || refining} style={{ width: "100%", background: selected ? C.terracotta : C.mist, color: "white", border: "none", borderRadius: 100, padding: 16, fontSize: "0.92rem", fontWeight: 500, cursor: selected ? "pointer" : "not-allowed", fontFamily: "'DM Sans',sans-serif", transition: "background 0.2s" }}>
          {refining ? "Finding perfect options..." : selected ? `Find Options for ${selected} →` : "Select your travel style above →"}
        </button>

        {refining && <div style={{ textAlign: "center", padding: "32px 0" }}><Spinner /></div>}

        {refined.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: C.terracotta, marginBottom: 14 }}>Your Tailored Options</div>
            {refined.map((r, i) => (
              <div key={i} style={{ background: "white", borderRadius: 14, padding: "16px 18px", marginBottom: 12, border: `1.5px solid rgba(212,201,184,0.5)` }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, marginBottom: 4 }}>{r.title}</div>
                <div style={{ fontSize: "0.82rem", lineHeight: 1.6, color: "rgba(26,18,8,0.55)", marginBottom: 8 }}>{r.description}</div>
                {r.highlight && <div style={{ fontSize: "0.78rem", color: C.terracotta, fontWeight: 500, marginBottom: 10 }}>✨ {r.highlight}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ background: "rgba(107,122,58,0.1)", color: C.olive, fontSize: "0.7rem", fontWeight: 500, padding: "3px 10px", borderRadius: 100 }}>{r.price}</span>
                  <span style={{ background: "rgba(200,87,58,0.08)", color: C.terracotta, fontSize: "0.7rem", fontWeight: 500, padding: "3px 10px", borderRadius: 100 }}>⏱ {r.duration}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function TrailureExplore() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [destination, setDestination] = useState("");
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedCard, setSelectedCard] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  async function doSearch(q) {
    const dest = q || query;
    if (!dest.trim()) return;
    setLoading(true);
    setError(null);
    setCards([]);
    setAllCards([]);
    setCategories([]);
    setDestination("");
    setBreadcrumb([dest]);
    setActiveCategory("All");
    try {
      const data = await callClaude(buildSearchPrompt(dest));
      const exps = data.experiences || [];
      setDestination(data.destination || dest);
      setCategories(["All", ...(data.categories || [])]);
      setAllCards(exps);
      setCards(exps);
    } catch (e) {
      setError(e.message || "Unknown error");
    }
    setLoading(false);
  }

  function filterCat(cat) {
    setActiveCategory(cat);
    setCards(cat === "All" ? allCards : allCards.filter(c => c.category === cat));
  }

  const hasResults = cards.length > 0 || loading || error;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        .exp-card { transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s; animation: fadeUp 0.4s ease both; }
        .exp-card:hover { transform: translateY(-4px); box-shadow: 0 16px 50px rgba(26,18,8,0.1); border-color: #C8573A !important; }
        .quick-tag:hover { border-color: #C8573A !important; color: #C8573A !important; }
        .cat-tab:hover { border-color: #C8573A !important; color: #C8573A !important; }
        input::placeholder { color: rgba(26,18,8,0.35); }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #D4C9B8; border-radius: 3px; }
      `}</style>

      <div style={{ background: C.sand, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: C.deep }}>

        {/* Nav */}
        <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", background: "rgba(245,239,224,0.9)", backdropFilter: "blur(12px)", borderBottom: `1px solid rgba(212,201,184,0.4)` }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
            Trail<span style={{ color: C.terracotta }}>ure</span>
          </div>
          <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "rgba(26,18,8,0.5)", letterSpacing: "0.05em" }}>AI Travel Discovery</div>
        </nav>

        {/* Search Hero */}
        <div style={{ padding: "60px 40px 48px", textAlign: "center", background: "radial-gradient(ellipse at 50% 0%, rgba(200,87,58,0.07) 0%, transparent 60%)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: C.terracotta, marginBottom: 16 }}>
            <span style={{ width: 20, height: 1, background: C.terracotta, display: "inline-block" }} />
            Smart Travel Companion
            <span style={{ width: 20, height: 1, background: C.terracotta, display: "inline-block" }} />
          </div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(2rem,4vw,3.4rem)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 10 }}>
            Where do you want to <em style={{ color: C.terracotta, fontStyle: "italic" }}>explore?</em>
          </h1>
          <p style={{ fontSize: "0.95rem", color: "rgba(26,18,8,0.5)", fontWeight: 300, marginBottom: 32, lineHeight: 1.6 }}>
            Type any destination — country, city, region, or vibe — and we'll uncover tailored experiences just for you.
          </p>

          {/* Search box */}
          <div style={{ maxWidth: 660, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", background: "white", borderRadius: 100, border: `2px solid ${C.mist}`, padding: "8px 8px 8px 24px", boxShadow: "0 8px 40px rgba(26,18,8,0.07)" }}>
              <span style={{ fontSize: "1.1rem", marginRight: 10, flexShrink: 0 }}>🌍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch()}
                placeholder="e.g. Africa, Japan, Patagonia, beach getaway..."
                style={{ flex: 1, border: "none", outline: "none", fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", background: "transparent", color: C.deep, padding: "6px 0" }}
              />
              <button onClick={() => doSearch()} disabled={loading} style={{ background: loading ? C.mist : C.terracotta, color: "white", border: "none", borderRadius: 100, padding: "13px 26px", fontSize: "0.88rem", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", flexShrink: 0, transition: "background 0.2s" }}>
                {loading ? "Searching..." : "Discover →"}
              </button>
            </div>

            {/* Quick tags */}
            {!hasResults && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
                {QUICK_TAGS.map(t => (
                  <button key={t.value} className="quick-tag" onClick={() => { setQuery(t.value); doSearch(t.value); }} style={{ background: "white", border: `1.5px solid ${C.mist}`, borderRadius: 100, padding: "7px 16px", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", color: C.deep, fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 40px 80px" }}>

          {/* Breadcrumb */}
          {breadcrumb.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "rgba(26,18,8,0.4)", marginBottom: 20, flexWrap: "wrap" }}>
              {breadcrumb.map((item, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: i === breadcrumb.length - 1 ? C.deep : undefined, fontWeight: i === breadcrumb.length - 1 ? 500 : 400, cursor: i < breadcrumb.length - 1 ? "pointer" : "default" }}
                    onClick={() => i === 0 && doSearch(item)}>{item}</span>
                  {i < breadcrumb.length - 1 && <span style={{ opacity: 0.4 }}>›</span>}
                </span>
              ))}
            </div>
          )}

          {/* Category tabs */}
          {categories.length > 0 && !loading && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
              {categories.map(cat => (
                <button key={cat} className="cat-tab" onClick={() => filterCat(cat)} style={{ padding: "7px 16px", borderRadius: 100, border: `1.5px solid ${activeCategory === cat ? C.terracotta : C.mist}`, background: activeCategory === cat ? "rgba(200,87,58,0.05)" : "white", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", color: activeCategory === cat ? C.terracotta : "rgba(26,18,8,0.6)", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>
                  {cat} ({cat === "All" ? allCards.length : allCards.filter(c => c.category === cat).length})
                </button>
              ))}
            </div>
          )}

          {/* Results header */}
          {destination && !loading && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.mist}` }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
                Exploring <em style={{ color: C.terracotta, fontStyle: "italic" }}>{destination}</em>
              </div>
              <div style={{ fontSize: "0.78rem", color: "rgba(26,18,8,0.4)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>{cards.length} experiences</div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <Spinner size={48} />
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, marginTop: 20, marginBottom: 6 }}>Exploring {query}...</div>
              <div style={{ fontSize: "0.82rem", color: "rgba(26,18,8,0.45)" }}>Curating hidden gems and local insights just for you</div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>😕</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>Couldn't load experiences</div>
              <div style={{ fontSize: "0.85rem", color: "rgba(26,18,8,0.5)", marginBottom: 24 }}>{error}</div>
              <button onClick={() => doSearch()} style={{ background: C.terracotta, color: "white", border: "none", borderRadius: 100, padding: "12px 28px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 500 }}>Try Again</button>
            </div>
          )}

          {/* Welcome state */}
          {!hasResults && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: "4rem", marginBottom: 16 }}>✈️</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", fontWeight: 700, marginBottom: 8 }}>Your journey begins with a destination</div>
              <div style={{ fontSize: "0.88rem", color: "rgba(26,18,8,0.45)" }}>Search above or pick a quick suggestion to get started</div>
            </div>
          )}

          {/* Cards grid */}
          {!loading && !error && cards.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 18 }}>
              {cards.map((exp, idx) => (
                <div key={exp.id} className="exp-card" style={{ background: "white", borderRadius: 20, overflow: "hidden", border: `1.5px solid rgba(212,201,184,0.5)`, cursor: "pointer", animationDelay: `${idx * 0.05}s` }}>
                  <div style={{ height: 96, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.8rem", position: "relative", background: BG_GRADIENTS[idx % BG_GRADIENTS.length] }}>
                    {exp.emoji || "🌍"}
                    <span style={{ position: "absolute", top: 10, right: 10, background: "rgba(26,18,8,0.65)", color: "white", fontSize: "0.62rem", fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", padding: "3px 9px", borderRadius: 100 }}>{exp.type || exp.category}</span>
                  </div>
                  <div style={{ padding: "18px 20px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.2 }}>{exp.title}</div>
                      <div style={{ fontSize: "0.76rem", fontWeight: 500, color: C.terracotta, whiteSpace: "nowrap", flexShrink: 0 }}>⭐ {exp.rating || "4.8"}</div>
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "rgba(26,18,8,0.42)", fontWeight: 500, marginBottom: 8 }}>📍 {exp.location}</div>
                    <div style={{ fontSize: "0.82rem", lineHeight: 1.6, color: "rgba(26,18,8,0.58)", fontWeight: 300, marginBottom: 12 }}>{exp.description}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                      {(exp.tags || []).map(t => <span key={t} style={{ background: "rgba(107,122,58,0.08)", color: C.olive, fontSize: "0.67rem", fontWeight: 500, padding: "3px 9px", borderRadius: 100 }}>{t}</span>)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid rgba(212,201,184,0.4)` }}>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", fontWeight: 700 }}>
                        {exp.price} <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 400, color: "rgba(26,18,8,0.38)" }}>/ {exp.priceNote || "person"}</span>
                      </div>
                      <button onClick={() => setSelectedCard(exp)} style={{ background: C.terracotta, color: "white", border: "none", borderRadius: 100, padding: "7px 16px", fontSize: "0.76rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "background 0.2s" }}>
                        Explore →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedCard && <DetailPanel exp={selectedCard} onClose={() => setSelectedCard(null)} />}
      </div>
    </>
  );
}
