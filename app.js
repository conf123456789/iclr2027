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

function buildUnderstandingTable(group, columns) {
  const rows = group.rows || [];
  const wrap = el("div", "table-wrap");
  const table = el("table", "demo-table ux-table");

  // 表头：每列一个 clip
  const thead = document.createElement("thead");
  const hrow = document.createElement("tr");
  hrow.appendChild(el("th", null, ""));
  hrow.appendChild(el("th", null, ""));
  rows.forEach((row, i) => {
    const th = el("th", "clip-head");
    const idEl = el("span", "clip-id", `rank ${i + 1}`);
    if (row.id) idEl.title = row.id;
    th.appendChild(idEl);
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  // 音频行
  const audioRow = document.createElement("tr");
  const audioHead = el("th", "row-label", "Audio");
  audioHead.colSpan = 2;
  audioRow.appendChild(audioHead);
  for (const row of rows) {
    const td = el("td", "audio-cell");
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.src = row.src;
    td.appendChild(audio);
    audioRow.appendChild(td);
  }
  tbody.appendChild(audioRow);

  // 每个任务两行：Ground truth / Prediction
  for (const col of columns) {
    for (const kind of ["gt", "pred"]) {
      const tr = document.createElement("tr");
      tr.className = kind === "gt" ? "gt-row" : "pred-row";
      if (kind === "gt") {
        const th = el("th", "task-name", col.label);
        th.rowSpan = 2;
        tr.appendChild(th);
      }
      tr.appendChild(el("th", "gp-label", kind === "gt" ? "Ground truth" : "Prediction"));

      for (const row of rows) {
        const v = (row.tasks || {})[col.key] || {};
        const td = el("td", "val-cell");
        if (col.key === "ASR") {
          td.className += " asr-cell";
          td.textContent = v[kind] || "";
        } else {
          if (kind === "pred" && !tdMatch(v)) td.className += " mismatch";
          td.appendChild(el("span", "val", v[kind] || "\u2014"));
          // \u6570\u503c\u6807\u6ce8\uff08\u65b9\u4f4d\u89d2 / \u4fef\u4ef0\u89d2 / \u8ddd\u79bb\uff09\u6682\u65f6\u4e0d\u5c55\u793a\uff1b
          // demos.json \u91cc\u7684 *_num \u5b57\u6bb5\u4e0e .ux-table .num \u6837\u5f0f\u90fd\u8fd8\u5728\uff0c\u6062\u590d\u53ea\u9700\u52a0\u56de\u4e0b\u9762\u4e24\u884c\u3002
          // const num = v[kind + "_num"];
          // if (num) td.appendChild(el("span", "num", num));
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function tdMatch(v) {
  return v.gt === v.pred;
}

function renderUnderstanding(root, cfg) {
  if (!root) return;
  root.replaceChildren();

  const groups = cfg && cfg.groups;
  if (!groups || !groups.length) {
    root.appendChild(el("p", "empty", "No understanding results yet. Edit demos.json."));
    return;
  }

  const columns = cfg.columns || [];
  for (const group of groups) {
    const box = el("div", "demo-group");
    box.appendChild(el("h3", null, group.title || "Group"));
    box.appendChild(buildUnderstandingTable(group, columns));
    root.appendChild(box);
  }
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
