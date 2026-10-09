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
    renderImages(document.getElementById("image-root"), data.images);
  } catch (err) {
    document.getElementById("audio-root").appendChild(
      el("p", "empty", "Could not load demos.json. Check the file is in the repo root.")
    );
    console.error(err);
  }
}

main();
