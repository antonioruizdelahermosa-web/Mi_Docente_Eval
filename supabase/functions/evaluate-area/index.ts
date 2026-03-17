import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { area, course, contents, activities } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Eres un experto en pedagogía y legislación educativa de España, enfocado estrictamente en la LOMLOE para Castilla-La Mancha.

El usuario te proporcionará tres datos: el Curso, los Contenidos trabajados y las Actividades realizadas en el aula. Tu tarea es relacionar las actividades prácticas con los contenidos teóricos, y traducirlos a la estructura curricular oficial.

Debes extraer y redactar los siguientes tres elementos, usando terminología rigurosa de los decretos curriculares de Castilla-La Mancha para el curso indicado:

Saberes básicos: Conocimientos, destrezas y actitudes vinculados.

Competencias específicas: Las competencias que se desarrollan a través de esas actividades.

Criterios de evaluación: Los referentes que indican el nivel de desempeño a evaluar.

Devuelve la respuesta ÚNICAMENTE en un JSON válido con esta estructura exacta: { "saberes_basicos": "...", "competencias_especificas": "...", "criterios_evaluacion": "..." }`;

    const userPrompt = `Curso: ${course}\nÁrea: ${area}\n\nContenidos trabajados en el trimestre:\n${contents}\n\nActividades realizadas en el aula:\n${activities}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de peticiones excedido. Inténtalo de nuevo en unos segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Añade fondos en la configuración de tu workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response (may be wrapped in markdown code block)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try to find JSON object in the text
      const braceMatch = content.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        parsed = JSON.parse(braceMatch[0]);
      } else {
        throw new Error("No se pudo parsear la respuesta de la IA");
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-area error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
