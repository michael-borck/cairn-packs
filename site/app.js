const status = document.querySelector("#status");
const grid = document.querySelector("#packs");

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function minutes(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  if (value < 60) return `${value} min`;
  const hours = Math.round((value / 60) * 10) / 10;
  return `${hours} hr`;
}

function packCard(pack, revoked) {
  const card = element("article", "pack-card");
  const revocation = revoked.find(
    (item) =>
      item.id === pack.id &&
      (item.version === undefined || item.version === pack.version)
  );
  if (revocation) card.classList.add("revoked");

  card.append(element("p", "pack-meta", `${pack.version} · ${pack.level}`));
  card.append(element("h2", "", pack.title));
  card.append(
    element(
      "p",
      "pack-meta",
      [
        pack.skills ? `${pack.skills} skills` : "",
        pack.items ? `${pack.items} items` : "",
        pack.labs ? `${pack.labs} labs` : "",
        minutes(pack.estimatedMinutes),
      ]
        .filter(Boolean)
        .join(" · ")
    )
  );
  card.append(element("p", "pack-description", pack.description ?? ""));
  if (revocation) {
    card.append(
      element(
        "p",
        "revoked-note",
        `Revoked: ${revocation.reason}${revocation.replacement ? ` Use ${revocation.replacement} instead.` : ""}`
      )
    );
  }

  if (Array.isArray(pack.tags) && pack.tags.length > 0) {
    const tags = element("div", "tags");
    for (const tag of pack.tags) tags.append(element("span", "tag", tag));
    card.append(tags);
  }

  const actions = element("div", "actions");
  const download = element(
    "a",
    "button",
    revocation ? "Revoked" : "Download .learnpack"
  );
  if (revocation) {
    download.classList.add("disabled");
    download.setAttribute("aria-disabled", "true");
  } else {
    download.href = pack.url;
    download.download = "";
  }
  actions.append(download);

  const details = element("a", "ghost-button", "Details");
  details.href = `catalog/packs/${pack.id}.json`;
  actions.append(details);
  card.append(actions);

  if (pack.sha256) {
    card.append(element("p", "hash", `sha256 ${pack.sha256}`));
  }

  return card;
}

async function main() {
  try {
    const response = await fetch("catalog/index.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`catalog returned ${response.status}`);
    }
    const catalog = await response.json();
    const packs = Array.isArray(catalog.packs) ? catalog.packs : [];
    const revoked = Array.isArray(catalog.revoked) ? catalog.revoked : [];

    status.textContent =
      packs.length === 0
        ? "No packs yet."
        : `${packs.length} official pack${packs.length === 1 ? "" : "s"}. Import a .learnpack in Cairn.`;

    grid.replaceChildren(...packs.map((pack) => packCard(pack, revoked)));
  } catch (error) {
    status.textContent = `Could not load the catalog: ${error.message}`;
    status.classList.add("error");
  }
}

main();
