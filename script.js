/* ------------------------------------------------------------------
   Valorant Map Picker — Best-of-3 Veto
   Current competitive map pool. Edit this array if the pool rotates.
   ------------------------------------------------------------------ */
const SPLASH = (id) => `https://media.valorant-api.com/maps/${id}/splash.png`;
const MAP_POOL = [
  { name: "Ascent",   img: SPLASH("7eaecc1b-4337-bbf6-6ab9-04b8f06b3319"), tint: "#3a6ea5" },
  { name: "Breeze",   img: SPLASH("2fb9a4fd-47b8-4e7d-a969-74b4046ebd53"), tint: "#2fb6c9" },
  { name: "Fracture", img: SPLASH("b529448b-4d60-346e-e89e-00a4c527a405"), tint: "#b58a3c" },
  { name: "Haven",    img: SPLASH("2bee0dc9-4ffe-519b-1cbd-7fbe763a6047"), tint: "#4caf7d" },
  { name: "Lotus",    img: SPLASH("2fe4ed3a-450a-948b-6d6b-e89a78e680a9"), tint: "#8e6fc4" },
  { name: "Pearl",    img: SPLASH("fd267378-4d1d-484f-ff52-77821ed10dc2"), tint: "#2f9fd8" },
  { name: "Split",    img: SPLASH("d960549e-485c-e861-8d71-aa9d1aed12a2"), tint: "#5a8fa8" },
];

/* The Bo3 veto sequence (matches the official 10-step process). */
function buildSteps() {
  return [
    { type: "ban",  team: "A", label: "Team A bans a map" },
    { type: "ban",  team: "B", label: "Team B bans a map" },
    { type: "ban",  team: "A", label: "Team A bans a map" },
    { type: "ban",  team: "B", label: "Team B bans a map" },
    { type: "pick", team: "A", label: "Team A picks the first map", mapIndex: 0 },
    { type: "side", team: "B", label: "Team B selects starting side for the first map", mapIndex: 0 },
    { type: "pick", team: "B", label: "Team B picks the second map", mapIndex: 1 },
    { type: "side", team: "A", label: "Team A selects starting side for the second map", mapIndex: 1 },
    { type: "decider", team: null, label: "Remaining map becomes the decider", mapIndex: 2 },
    { type: "side", team: "A", label: "Team A selects starting side for the decider map", mapIndex: 2 },
  ];
}

const els = {
  setup: document.getElementById("setup"),
  veto: document.getElementById("veto"),
  result: document.getElementById("result"),
  team1: document.getElementById("team1Name"),
  team2: document.getElementById("team2Name"),
  poolPreview: document.getElementById("poolPreview"),
  coinArea: document.getElementById("coinArea"),
  coin: document.getElementById("coin"),
  tossResult: document.getElementById("tossResult"),
  tossBtn: document.getElementById("tossBtn"),
  startBtn: document.getElementById("startBtn"),
  actorBadge: document.getElementById("actorBadge"),
  instruction: document.getElementById("instruction"),
  stepList: document.getElementById("stepList"),
  mapGrid: document.getElementById("mapGrid"),
  sidePicker: document.getElementById("sidePicker"),
  sidePrompt: document.getElementById("sidePrompt"),
  resultMaps: document.getElementById("resultMaps"),
  resetBtn: document.getElementById("resetBtn"),
  copyBtn: document.getElementById("copyBtn"),
};

let state = null;

/* ---------- Setup screen ---------- */
function renderPoolPreview() {
  els.poolPreview.innerHTML = "";
  MAP_POOL.forEach((m) => {
    const chip = document.createElement("span");
    chip.className = "pool-chip";
    chip.textContent = m.name;
    els.poolPreview.appendChild(chip);
  });
}

function teamName(team) {
  if (team === "A") return state.names.A;
  if (team === "B") return state.names.B;
  return "";
}

/* ---------- Coin toss (decides who is Team A / Team B) ---------- */
let coinDeg = 0; // cumulative coin rotation, so each toss spins forward

function rollToss() {
  const t1 = els.team1.value.trim() || "Team 1";
  const t2 = els.team2.value.trim() || "Team 2";
  const team1Wins = Math.random() < 0.5;
  // Toss winner becomes Team A and bans first.
  return team1Wins
    ? { A: t1, B: t2, winner: t1, team1Wins }
    : { A: t2, B: t1, winner: t2, team1Wins };
}

function coinToss() {
  if (els.coin.classList.contains("spinning")) return;
  assignment = rollToss();
  els.coinArea.classList.remove("hidden");
  els.tossResult.classList.remove("show");
  els.startBtn.classList.add("hidden");
  els.coin.classList.add("spinning");
  els.tossBtn.disabled = true;

  // On the first toss the coin area goes from display:none to visible, so the
  // browser has no prior transform to animate from. Force a reflow at the
  // current rotation first, then set the new one so the spin always animates.
  els.coin.style.transform = `rotateY(${coinDeg}deg)`;
  void els.coin.offsetWidth;

  // Spin >=5 turns and land on the winner's face (heads = Team 1, tails = Team 2).
  const base = coinDeg + 360 * 5;
  coinDeg = Math.ceil(base / 360) * 360 + (assignment.team1Wins ? 0 : 180);
  els.coin.style.transform = `rotateY(${coinDeg}deg)`;

  clearTimeout(coinToss._t);
  coinToss._t = setTimeout(() => {
    els.coin.classList.remove("spinning");
    els.tossBtn.disabled = false;
    els.tossBtn.textContent = "Re-toss";
    els.tossBtn.classList.add("is-retoss");
    els.tossResult.innerHTML =
      `<b>${assignment.winner}</b> wins the toss — Team A (bans first)`;
    els.tossResult.classList.add("show");
    els.startBtn.classList.remove("hidden");
  }, 1450);
}

function resetSetup() {
  assignment = null;
  els.coinArea.classList.add("hidden");
  els.tossResult.classList.remove("show");
  els.startBtn.classList.add("hidden");
  els.tossBtn.classList.remove("hidden");
  els.tossBtn.disabled = false;
  els.tossBtn.textContent = "Coin Toss";
  els.tossBtn.classList.remove("is-retoss");
}

/* Filled by the coin toss: which entered team is A (bans first) vs B. */
let assignment = null;

function startVeto() {
  // Fall back to a 50/50 if Start is somehow reached without a toss.
  if (!assignment) assignment = rollToss();
  state = {
    names: { A: assignment.A, B: assignment.B },
    steps: buildSteps(),
    stepIdx: 0,
    maps: MAP_POOL.map((m) => ({
      ...m,
      status: "available", // available | banned | picked
      pickedOrder: null,    // 1, 2, 3
      pickedBy: null,       // A | B | null (decider)
      sideTeam: { A: null, B: null }, // side each team starts on
    })),
    pickCount: 0,
    lastActed: null,   // index of map just banned/picked (for animation)
    firstRender: true, // staggered card reveal on first veto render
  };
  els.setup.classList.add("hidden");
  els.result.classList.add("hidden");
  els.veto.classList.remove("hidden");
  renderStepList();
  advance();
}

/* ---------- Veto flow ---------- */
function currentStep() {
  return state.steps[state.stepIdx];
}

function advance() {
  // Auto-resolve the decider (no user action needed).
  const step = currentStep();
  if (step && step.type === "decider") {
    const remaining = state.maps.find((m) => m.status === "available");
    remaining.status = "picked";
    remaining.pickedOrder = 3;
    remaining.pickedBy = null; // decider not picked by a team
    state.lastActed = state.maps.indexOf(remaining); // pulse the decider
    state.stepIdx++;
    return advance();
  }
  if (!step) {
    finish();
    return;
  }
  renderStepList();
  renderVeto();
}

function renderStepList() {
  els.stepList.innerHTML = "";
  state.steps.forEach((s, i) => {
    const li = document.createElement("li");
    li.textContent = i + 1;
    const txt = s.label
      .replace("Team A", state.names.A)
      .replace("Team B", state.names.B);
    li.title = txt; // full step text on hover
    if (i < state.stepIdx) li.classList.add("done");
    if (i === state.stepIdx) li.classList.add("active");
    els.stepList.appendChild(li);
  });
}

function renderVeto() {
  const step = currentStep();
  // Badge + instruction
  if (step.type === "side") {
    els.actorBadge.textContent = teamName(step.team);
    els.actorBadge.className =
      "actor-badge " + (step.team === "A" ? "team-a-color" : "team-b-color");
    const map = state.maps[findMapByOrder(step.mapIndex)];
    els.instruction.textContent = `${teamName(step.team)} — pick starting side on ${map.name}`;
    showSidePicker(step, map);
  } else {
    hideSidePicker();
    els.actorBadge.textContent = teamName(step.team);
    els.actorBadge.className =
      "actor-badge " + (step.team === "A" ? "team-a-color" : "team-b-color");
    const verb = step.type === "ban" ? "ban" : "pick";
    els.instruction.textContent = `${teamName(step.team)} — ${verb} a map`;
  }
  renderMaps();
}

/* mapIndex on side steps refers to pick order (0=map1,1=map2,2=decider).
   Find the actual map object index for a given pick order. */
function findMapByOrder(order) {
  return state.maps.findIndex((m) => m.pickedOrder === order + 1);
}

function renderMaps() {
  const step = currentStep();
  const selectable = step && (step.type === "ban" || step.type === "pick");
  els.mapGrid.innerHTML = "";
  // Stagger the cards in on the very first render only.
  els.mapGrid.classList.toggle("reveal", state.firstRender);
  state.firstRender = false;
  state.maps.forEach((m, idx) => {
    const card = document.createElement("div");
    card.className = "map-card";
    if (m.status !== "available") card.classList.add("disabled");
    if (m.status === "banned") card.classList.add("banned");
    if (m.status === "picked") card.classList.add("picked");
    if (idx === state.lastActed) card.classList.add("just-acted");

    const art = document.createElement("div");
    art.className = "map-art";
    art.style.backgroundColor = m.tint;
    if (m.img) art.style.backgroundImage = `url("${m.img}")`;
    card.appendChild(art);

    if (m.status === "banned") {
      const slash = document.createElement("div");
      slash.className = "slash";
      card.appendChild(slash);
      const tag = document.createElement("span");
      tag.className = "tag ban";
      tag.textContent = "Banned";
      card.appendChild(tag);
    } else if (m.status === "picked") {
      const tag = document.createElement("span");
      tag.className = "tag pick";
      tag.textContent =
        m.pickedOrder === 3 ? "Decider" : `Map ${m.pickedOrder}`;
      card.appendChild(tag);
    }

    const name = document.createElement("span");
    name.className = "map-name";
    name.textContent = m.name;
    card.appendChild(name);

    if (selectable && m.status === "available") {
      card.addEventListener("click", () => handleMapClick(idx));
    }
    els.mapGrid.appendChild(card);
  });
}

function handleMapClick(idx) {
  const step = currentStep();
  const map = state.maps[idx];
  if (map.status !== "available") return;

  if (step.type === "ban") {
    map.status = "banned";
  } else if (step.type === "pick") {
    state.pickCount++;
    map.status = "picked";
    map.pickedOrder = state.pickCount; // 1 then 2
    map.pickedBy = step.team;
  }
  state.lastActed = idx;
  state.stepIdx++;
  advance();
}

/* ---------- Side picker ---------- */
function showSidePicker(step, map) {
  els.sidePicker.classList.remove("hidden");
  const chooser = teamName(step.team);
  els.sidePrompt.textContent = `${chooser} — choose your starting side on ${map.name}`;
  els.sidePicker.querySelectorAll(".btn-side").forEach((btn) => {
    btn.onclick = () => chooseSide(step, map, btn.dataset.side);
  });
}
function hideSidePicker() {
  els.sidePicker.classList.add("hidden");
}

function chooseSide(step, map, side) {
  const chooser = step.team;
  const other = chooser === "A" ? "B" : "A";
  const opposite = side === "Attack" ? "Defense" : "Attack";
  map.sideTeam[chooser] = side;
  map.sideTeam[other] = opposite;
  state.lastActed = null; // side choice doesn't ban/pick a map; stop replaying anims
  state.stepIdx++;
  advance();
}

/* ---------- Result ---------- */
function finish() {
  els.veto.classList.add("hidden");
  els.result.classList.remove("hidden");
  els.resultMaps.innerHTML = "";

  const ordered = [1, 2, 3]
    .map((o) => state.maps.find((m) => m.pickedOrder === o))
    .filter(Boolean);

  ordered.forEach((m) => {
    const row = document.createElement("div");
    row.className = "result-map" + (m.pickedOrder === 3 ? " decider" : "");

    if (m.img) {
      const art = document.createElement("div");
      art.className = "res-art";
      art.style.backgroundImage = `url("${m.img}")`;
      row.appendChild(art);
    }

    const order = document.createElement("div");
    order.className = "result-order";
    order.textContent = m.pickedOrder;
    row.appendChild(order);

    const info = document.createElement("div");
    info.className = "result-info";
    const nm = document.createElement("div");
    nm.className = "result-mapname";
    nm.textContent = m.name;
    info.appendChild(nm);

    const meta = document.createElement("div");
    meta.className = "result-meta";
    if (m.pickedOrder === 3) {
      meta.innerHTML = `Decider map`;
    } else {
      meta.innerHTML = `Picked by <b>${teamName(m.pickedBy)}</b>`;
    }
    info.appendChild(meta);
    row.appendChild(info);

    const sides = document.createElement("div");
    sides.className = "result-sides";
    ["A", "B"].forEach((t) => {
      const pill = document.createElement("span");
      const side = m.sideTeam[t];
      pill.className = "side-pill " + (side === "Attack" ? "attack" : "defense");
      pill.textContent = `${teamName(t)}: ${side}`;
      sides.appendChild(pill);
    });
    row.appendChild(sides);

    els.resultMaps.appendChild(row);
  });
}

/* ---------- Copy result ---------- */
function buildResultText() {
  const ordered = [1, 2, 3]
    .map((o) => state.maps.find((m) => m.pickedOrder === o))
    .filter(Boolean);
  const lines = [`${state.names.A} vs ${state.names.B} — Bo3 Map Veto`, ""];
  ordered.forEach((m) => {
    const tag = m.pickedOrder === 3 ? "decider" : `picked by ${teamName(m.pickedBy)}`;
    lines.push(`${m.pickedOrder}. ${m.name} — ${tag}`);
    lines.push(`   ${state.names.A}: ${m.sideTeam.A} | ${state.names.B}: ${m.sideTeam.B}`);
  });
  return lines.join("\n");
}

async function copyResult() {
  const text = buildResultText();
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch (e) {
    // Fallback for non-secure contexts / older browsers.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
    document.body.removeChild(ta);
  }
  els.copyBtn.textContent = ok ? "Copied!" : "Copy failed";
  els.copyBtn.classList.toggle("copied", ok);
  clearTimeout(copyResult._t);
  copyResult._t = setTimeout(() => {
    els.copyBtn.textContent = "Copy Result";
    els.copyBtn.classList.remove("copied");
  }, 1800);
}

/* ---------- Init ---------- */
els.tossBtn.addEventListener("click", coinToss);
els.coin.addEventListener("click", coinToss);
els.startBtn.addEventListener("click", startVeto);
els.copyBtn.addEventListener("click", copyResult);
els.resetBtn.addEventListener("click", () => {
  els.result.classList.add("hidden");
  resetSetup();
  els.setup.classList.remove("hidden");
});
renderPoolPreview();
