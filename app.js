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

function renderAudio(root, examples) {
  root.replaceChildren();
  if (!examples?.length) {
    root.appendChild(el("p", "empty", "No audio examples yet. Edit demos.json and add files under assets/audio/."));
    return;
  }

  for (const example of examples) {
    const box = el("article", "example");
    box.appendChild(el("h3", null, example.title || "Example"));
    if (example.note) box.appendChild(el("p", "note", example.note));

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
    renderAudio(document.getElementById("audio-root"), data.audio);
    renderImages(document.getElementById("image-root"), data.images);
  } catch (err) {
    document.getElementById("audio-root").appendChild(
      el("p", "empty", "Could not load demos.json. Check the file is in the repo root.")
    );
    console.error(err);
  }
}

main();
