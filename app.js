async function loadDemos() {
  const res = await fetch("demos.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load demos.json");
  return res.json();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function renderAudio(root, examples, emptyText) {
  root.replaceChildren();
  if (!examples?.length) {
    root.appendChild(el("p", "empty", emptyText || "No audio examples yet. Edit demos.json and add files under assets/audio/."));
    return;
  }

  for (const example of examples) {
    const box = el("article", "example");
    box.appendChild(el("h3", null, example.title || "Example"));
    if (example.note) box.appendChild(el("p", "note", example.note));
    for (const detail of example.details || []) {
      const row = el("p", "detail");
      row.appendChild(el("span", "detail-label", detail.label));
      row.appendChild(document.createTextNode(detail.text));
      box.appendChild(row);
    }

    const clips = el("div", "clips");
    for (const clip of example.clips || []) {
      const wrap = el("div", "clip");
      wrap.appendChild(el("span", "clip-label", clip.label || "Audio"));

      const audio = document.createElement("audio");
      audio.controls = true;
      audio.preload = "metadata";
      audio.src = clip.src;

      const missing = el("div", "missing", `Missing file: ${clip.src}`);
      missing.hidden = true;

      audio.addEventListener("error", () => {
        audio.hidden = true;
        missing.hidden = false;
      });

      wrap.appendChild(audio);
      wrap.appendChild(missing);
      clips.appendChild(wrap);
    }

    box.appendChild(clips);
    root.appendChild(box);
  }
}

function renderImages(root, images) {
  root.replaceChildren();
  if (!images?.length) {
    root.appendChild(el("p", "empty", "No images yet. Edit demos.json and add files under assets/images/."));
    return;
  }

  for (const item of images) {
    const fig = el("figure", "figure");
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.caption || "Demo figure";
    img.loading = "lazy";

    const missing = el("div", "missing", `Missing file: ${item.src}`);
    missing.hidden = true;
    missing.style.margin = "1rem";

    img.addEventListener("error", () => {
      img.remove();
      missing.hidden = false;
    });

    fig.appendChild(img);
    fig.appendChild(missing);
    if (item.caption) {
      const cap = document.createElement("figcaption");
      cap.textContent = item.caption;
      fig.appendChild(cap);
    }
    root.appendChild(fig);
  }
}

function renderGroups(root, groups, emptyText) {
  root.replaceChildren();
  if (!groups?.length) {
    root.appendChild(el("p", "empty", emptyText || "Nothing here yet. Edit demos.json."));
    return;
  }

  for (const group of groups) {
    const box = el("div", "demo-group");
    box.appendChild(el("h3", null, group.title || "Category"));
    if (group.note) box.appendChild(el("p", "note", group.note));

    const stack = el("div", "stack");
    renderAudio(stack, group.examples, "No examples in this category.");
    box.appendChild(stack);
    root.appendChild(box);
  }
}

const UNDERSTANDING_TASKS = [
  { key: "Dir",    label: "Direction" },
  { key: "Updown", label: "Up / Down" },
  { key: "Dist",   label: "Distance" },
  { key: "Motion", label: "Motion" },
];

function buildUnderstandingTable(clips, wavPrefix) {
  const wrap = el("div", "table-wrap");
  const table = el("table", "demo-table");

  const thead = document.createElement("thead");
  const hrow = document.createElement("tr");
  hrow.appendChild(el("th", null, "Clip"));
  for (const t of UNDERSTANDING_TASKS) hrow.appendChild(el("th", null, t.label));
  hrow.appendChild(el("th", null, "ASR"));
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const clip of clips) {
    const row = document.createElement("tr");

    // 音频列
    const tdClip = el("td", "clip-col");
    tdClip.appendChild(el("span", "clip-id", clip.clip_id));
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.src = wavPrefix + String(clip.wav || "").replace(/^audio\//, "");
    tdClip.appendChild(audio);
    row.appendChild(tdClip);

    // 四项标签任务
    for (const t of UNDERSTANDING_TASKS) {
      const v = clip[t.key] || {};
      const ok = v.gt_label === v.pred_label;
      const td = el("td", ok ? "cell ok" : "cell bad");
      td.title = `ground truth: ${v.gt_label ?? "—"}`;
      td.appendChild(el("span", "pred", v.pred_label ?? "—"));
      td.appendChild(el("span", "mark", ok ? "✓" : "✗"));
      row.appendChild(td);
    }

    // ASR 列
    const tdAsr = el("td", "asr-col", clip.ASR?.pred_text || "");
    row.appendChild(tdAsr);

    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function renderUnderstanding(root, cfg) {
  if (!root) return;
  root.replaceChildren();
  if (!cfg?.results) {
    root.appendChild(el("p", "empty", "No understanding results configured."));
    return;
  }

  fetch(cfg.results, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      const byMotion = new Map();
      for (const clip of data.clips || []) {
        const m = clip.motion || "other";
        if (!byMotion.has(m)) byMotion.set(m, []);
        byMotion.get(m).push(clip);
      }
      root.replaceChildren();
      for (const [motion, clips] of byMotion) {
        const box = el("div", "demo-group");
        box.appendChild(el("h3", null, motion.charAt(0).toUpperCase() + motion.slice(1)));
        box.appendChild(
          el("p", "note", `Questions asked: ${(data.require || []).join(" · ") || "—"}`)
        );
        box.appendChild(buildUnderstandingTable(clips, cfg.wavPrefix || ""));
        root.appendChild(box);
      }
    })
    .catch((err) => {
      root.replaceChildren();
      root.appendChild(el("p", "empty", "Could not load the understanding results."));
      console.error(err);
    });
}

async function main() {
  try {
    const data = await loadDemos();
    if (data.title) {
      document.getElementById("page-title").textContent = data.title;
      document.title = `${data.title} · Demo`;
    }
    if (data.description) {
      document.getElementById("page-desc").textContent = data.description;
    }
    const reconRoot = document.getElementById("recon-root");
    if (reconRoot) {
      renderAudio(
        reconRoot,
        data.recon,
        "No reconstruction examples yet. Edit demos.json and add files under recon/."
      );
    }
    renderGroups(
      document.getElementById("audio-root"),
      data.audio,
      "No TTS examples yet. Edit demos.json and add files under assets/audio/tts/."
    );
    const editRoot = document.getElementById("edit-root");
    if (editRoot) {
      renderGroups(editRoot, data.edit, "No editing examples yet. Edit demos.json and add files under assets/audio/edit/.");
    }
    renderUnderstanding(document.getElementById("understanding-root"), data.understanding);
    const imageRoot = document.getElementById("image-root");
    if (imageRoot) renderImages(imageRoot, data.images);
  } catch (err) {
    document.getElementById("audio-root").appendChild(
      el("p", "empty", "Could not load demos.json. Check the file is in the repo root.")
    );
    console.error(err);
  }
}

main();
