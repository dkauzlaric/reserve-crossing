// Reserve Crossing Apartments — interest form handler
// Sends form submissions via Resend. API key lives in the RESEND_API_KEY env var.

const FROM = "Reserve Crossing Apartments <leads@send.reservecrossingapartments.com>";
const TO = ["ppc@growthkings.com"]; // update to final leasing inboxes when ready

const PLAN_LABELS = {
  type1: "Unit Type 1 — 1,097 sq ft",
  type2: "Unit Type 2 — 1,060 sq ft",
  type3: "Unit Type 3 — 1,051 sq ft",
  "": "No preference",
};

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const b = req.body || {};

  // Honeypot: real visitors never fill this field
  if (b.company) return res.status(200).json({ ok: true });

  const firstName = String(b.firstName || "").trim().slice(0, 100);
  const lastName = String(b.lastName || "").trim().slice(0, 100);
  const email = String(b.email || "").trim().slice(0, 200);
  const phone = String(b.phone || "").trim().slice(0, 50);
  const plan = PLAN_LABELS[b.plan] || "No preference";
  const message = String(b.message || "").trim().slice(0, 5000);

  if (!firstName || !lastName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Missing or invalid fields" });
  }

  const rows = [
    ["First Name", firstName],
    ["Last Name", lastName],
    ["Email", email],
    ["Phone", phone || "—"],
    ["Preferred Floor Plan", plan],
    ["Message", message || "—"],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 16px 8px 0;font-weight:600;color:#3d3d3d;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:8px 0;color:#3d3d3d">${esc(v)}</td></tr>`
    )
    .join("");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">
    <h2 style="color:#3d3d3d;margin:0 0 4px">New Interest Form Submission</h2>
    <p style="color:#9a7b4f;margin:0 0 20px;font-size:13px;letter-spacing:1px;text-transform:uppercase">Reserve Crossing Apartments</p>
    <table style="border-collapse:collapse;font-size:14px">${rows}</table>
    <p style="color:#999;font-size:12px;margin-top:24px">Submitted via reservecrossingapartments.com — reply to this email to respond directly to the lead.</p>
  </div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: TO,
        reply_to: email,
        subject: `New Interest Form Submission – ${firstName} ${lastName}`,
        html,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error("Resend error:", r.status, detail);
      return res.status(502).json({ ok: false, error: "Email delivery failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Submit handler error:", err);
    return res.status(500).json({ ok: false, error: "Internal error" });
  }
}
