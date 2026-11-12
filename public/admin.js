
const box = document.getElementById("adminList");

async function load() {
  try {
    const r = await fetch("/api/admin/applications");

    if (r.status === 401) {
      box.textContent =
        "Ingia kwa kutumia fomu iliyo juu ili kuona maombi.";
      return;
    }

    const rows = await r.json();

    if (!rows.length) {
      box.textContent = "Bado hakuna maombi.";
      return;
    }

    box.innerHTML = rows.map(x => `
      <article class="application">
        <b>${esc(x.reference)}</b>

        <p>
          ${esc(x.full_name)} ·
          ${esc(x.country_code)} ${esc(x.phone)}
        </p>

        <p>
          ${Number(x.amount).toLocaleString()} TZS ·
          ${esc(x.country)}
        </p>

        <p>Sababu: ${esc(x.purpose)}</p>

        <p>
          Hali: <b>${esc(x.status)}</b>
        </p>

        <button onclick="decide('${esc(x.reference)}','Approved for further processing')">
          Idhinisha ukaguzi
        </button>

        <button class="secondary"
          onclick="decide('${esc(x.reference)}','Rejected')">
          Kataa
        </button>
      </article>
    `).join("");

  } catch (e) {
    box.textContent = "Imeshindikana kupakia maombi.";
  }
}


async function decide(ref, status) {
  const r = await fetch(
    "/api/admin/applications/" +
    encodeURIComponent(ref) +
    "/status",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    }
  );

  const d = await r.json();

  if (!r.ok) {
    alert(d.error || "Hitilafu");
    return;
  }

  load();
}


function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}


load();
