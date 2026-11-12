
const $ = id => document.getElementById(id);

const money = n =>
  Number(n).toLocaleString("en-US") + " TZS";

const read = () =>
  JSON.parse(sessionStorage.getItem("draft") || "{}");

const save = d =>
  sessionStorage.setItem("draft", JSON.stringify(d));


// PAGE 1: Choose loan amount
if ($("amount")) {
  $("amount").oninput = () => {
    $("amountText").textContent = money($("amount").value);
  };

  $("next").onclick = () => {
    save({
      ...read(),
      amount: Number($("amount").value)
    });

    location.href = "details.html";
  };
}


// PAGE 2: Applicant details
if ($("details")) {
  $("details").onsubmit = e => {
    e.preventDefault();

    save({
      ...read(),
      fullName: $("fullName").value.trim(),
      countryCode: $("countryCode").value.trim(),
      phone: $("phone").value.trim(),
      country: $("country").value.trim(),
      purpose: $("purpose").value.trim()
    });

    location.href = "review.html";
  };
}


// PAGE 3: Review application
if ($("summary")) {
  const d = read();

  const rows = [
    ["Kiasi", money(d.amount)],
    ["Jina", d.fullName],
    ["Msimbo wa nchi", d.countryCode],
    ["Simu", d.phone],
    ["Nchi", d.country],
    ["Sababu", d.purpose]
  ];

  $("summary").innerHTML = rows
    .map(([k, v]) =>
      `<dt>${esc(k)}</dt><dd>${esc(v || "")}</dd>`
    )
    .join("");
}


// Submit application
if ($("submit")) {
  $("submit").onclick = async () => {
    const d = read();

    $("submit").disabled = true;

    try {
      const r = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(d)
      });

      const out = await r.json();

      if (!r.ok) {
        throw new Error(out.error || "Imeshindikana");
      }

      sessionStorage.setItem("reference", out.reference);

      location.href = "status.html";

    } catch (e) {
      alert(e.message);
      $("submit").disabled = false;
    }
  };
}


// PAGE 4: Check application status
if ($("status")) {
  const load = async () => {
    const ref = sessionStorage.getItem("reference");

    $("ref").textContent = ref || "Haipo";

    if (!ref) {
      $("status").textContent =
        "Hakuna kumbukumbu ya ombi katika kikao hiki.";
      return;
    }

    try {
      const r = await fetch(
        "/api/applications/" + encodeURIComponent(ref)
      );

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.error);
      }

      $("status").textContent = "Hali: " + d.status;

    } catch (e) {
      $("status").textContent = e.message;
    }
  };

  $("refresh").onclick = load;

  load();
}


// Escape HTML to protect displayed information
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}
