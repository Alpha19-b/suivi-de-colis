// supabase/functions/track17/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

/**
 * ✅ Objectif
 * - Éviter le message côté front: "Edge Function returned a non-2xx status code"
 * - Toujours répondre en 200 avec { ok:false, code:..., message:... } en cas d'erreur
 * - Lire le secret avec plusieurs noms possibles (au cas où)
 * - CORS propre
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function readBody(req: Request): Promise<any> {
  // Support JSON strict + fallback text
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      return {};
    }
  }
  const txt = await req.text().catch(() => "");
  try {
    return JSON.parse(txt);
  } catch {
    return {};
  }
}

// ✅ Secret: accepte plusieurs clés possibles pour éviter les erreurs de nom
function getTrackToken() {
  return (
    Deno.env.get("TRACK17_TOKEN") ||
    Deno.env.get("TRACK17TOKEN") ||
    Deno.env.get("TRACK17_KEY") ||
    Deno.env.get("TRACK17TOKEN_KEY") ||
    ""
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  // ✅ Toujours retourner 200 en cas d'erreur => supabase.functions.invoke() ne crie plus “non-2xx”
  try {
    const TRACK17_TOKEN = getTrackToken();
    if (!TRACK17_TOKEN) {
      return json({ ok: false, code: 5001, message: "Secret 17TRACK manquant. Ajoute TRACK17_TOKEN dans Edge Functions → Secrets." });
    }

    const body = await readBody(req);
    const action = body?.action;
    const number = body?.number;

    if (!number || typeof number !== "string") {
      return json({ ok: false, code: 4001, message: "Numéro invalide (body.number)" });
    }

    const endpoint =
      action === "register"
        ? "https://api.17track.net/track/v2.2/register"
        : action === "get"
        ? "https://api.17track.net/track/v2.2/gettrackinfo"
        : null;

    if (!endpoint) {
      return json({ ok: false, code: 4002, message: "Action inconnue. Utilise action=register ou action=get." });
    }

    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": TRACK17_TOKEN,
      },
      body: JSON.stringify([{ number }]),
    });

    const rawText = await r.text();
    let raw: any = null;
    try {
      raw = JSON.parse(rawText);
    } catch {
      raw = { code: -1, message: "Réponse 17TRACK non-JSON", rawText };
    }

    // Même si 17TRACK renvoie erreur HTTP, on renvoie un JSON clair
    if (!r.ok) {
      return json({
        ok: false,
        code: 5021,
        message: `Erreur 17TRACK HTTP ${r.status}`,
        debug: { endpoint, status: r.status },
        raw,
      });
    }

    // ✅ Version enrichie (utile côté front)
    if (action === "get" && raw?.code === 0) {
      const accepted0 = raw?.data?.accepted?.[0];
      const trackInfo = accepted0?.track_info;
      const latestStatus = trackInfo?.latest_status?.status ?? "NotFound";
      const providers = trackInfo?.tracking?.providers ?? [];
      const events = providers?.[0]?.events ?? [];

      const updates = (events || []).map((ev: any) => ({
        date: ev?.time_iso || ev?.time || new Date().toISOString(),
        status: latestStatus, // tu peux mapper côté front si tu veux
        note: ev?.description || ev?.description_translation || "Mise à jour 17TRACK",
      }));

      const message =
        events?.length > 0
          ? "OK"
          : latestStatus === "NotFound"
          ? "Aucune information 17TRACK pour ce numéro (pas encore scanné / mauvais numéro)."
          : "Aucune mise à jour pour le moment.";

      return json({
        ok: true,
        code: 0,
        carrier: accepted0?.carrier ?? null,
        provider: providers?.[0]?.provider?.name ?? null,
        latest_status: latestStatus,
        message,
        updates,
        raw,
      });
    }

    // Sinon (register) : renvoyer le brut + ok
    return json({ ok: true, ...raw });
  } catch (e) {
    return json({
      ok: false,
      code: 5000,
      message: "Erreur interne Edge Function",
      error: String(e?.message || e),
    });
  }
});

/*
✅ Après avoir collé ce fichier, redeploie:
  supabase functions deploy track17

✅ Et côté front, lis res.data.ok / res.data.message au lieu d'un simple alert JSON.
*/
