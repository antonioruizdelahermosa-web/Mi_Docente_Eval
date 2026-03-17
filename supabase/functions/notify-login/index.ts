import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAIL = "antonio.ruizdelahermosa@colecalatrava.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, userId } = await req.json();

    if (!email || email === ADMIN_EMAIL) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this user already has teacher_data (i.e. not their first login)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existing } = await supabaseAdmin
      .from("teacher_data")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      // Not first login — skip notifications
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "returning_user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });

    // 1. Notify admin about new teacher registration
    const adminEmailPromise = fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Gestión Docente <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: `Nuevo docente registrado — ${email}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">🆕 Nuevo docente registrado</h2>
            <p>Un nuevo docente se ha registrado y ha accedido por primera vez a Gestión Docente:</p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 8px 0 0;"><strong>Fecha:</strong> ${now}</p>
            </div>
            <p style="color: #666; font-size: 14px;">CEIP Calatrava — Gestión Docente</p>
          </div>
        `,
      }),
    });

    // 2. Send disclaimer email to the new teacher
    const userEmailPromise = fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Gestión Docente <onboarding@resend.dev>",
        to: [email],
        subject: "Bienvenido/a a Gestión Docente — CEIP Calatrava",
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">👋 Bienvenido/a a Gestión Docente</h2>
            <p>Has accedido correctamente a la aplicación de <strong>Gestión Docente</strong> del CEIP Calatrava.</p>
            <div style="background: #fffbe6; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 16px 0;">
              <p style="margin: 0; font-size: 14px;"><strong>⚠️ Aviso importante:</strong></p>
              <p style="margin: 8px 0 0; font-size: 14px;">
                El uso de esta aplicación es <strong>responsabilidad exclusiva del usuario</strong>. 
                Los datos introducidos, las calificaciones registradas y los informes generados son 
                gestionados bajo tu criterio profesional. Asegúrate de cumplir con la normativa vigente 
                en materia de protección de datos y evaluación educativa.
              </p>
            </div>
            <p>Ya puedes comenzar a gestionar tus áreas, alumnos y calificaciones.</p>
            <p style="color: #666; font-size: 13px; margin-top: 24px;">CEIP Calatrava — Gestión Docente</p>
          </div>
        `,
      }),
    });

    const [adminRes, userRes] = await Promise.all([adminEmailPromise, userEmailPromise]);
    const [adminData, userData] = await Promise.all([adminRes.json(), userRes.json()]);

    return new Response(JSON.stringify({ ok: true, admin: adminData, user: userData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
