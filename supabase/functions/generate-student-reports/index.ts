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
    const { area, course, saberes_basicos, competencias_especificas, criterios_evaluacion, students } = await req.json();
    // students: Array<{ name: string, grade: number | null, markers?: object }>

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Eres un experto en pedagogía y legislación educativa LOMLOE de Castilla-La Mancha. 
Vas a generar informes cualitativos individuales para cada alumno de un área específica.

Datos del área:
- Área: ${area}
- Curso: ${course}
- Saberes básicos trabajados: ${saberes_basicos}
- Competencias específicas: ${competencias_especificas}  
- Criterios de evaluación: ${criterios_evaluacion}

Para cada alumno recibirás su nombre, calificación numérica (0-10) y marcadores especiales (repetidor, áreas suspensas anteriores, déficits).

Genera un informe cualitativo de 3-5 frases por alumno que:
1. Mencione el nivel de adquisición de los saberes básicos según su nota.
2. Relacione su desempeño con las competencias específicas.
3. Indique recomendaciones según los criterios de evaluación.
4. Si tiene marcadores especiales, incluya una referencia a las medidas de atención necesarias según la legislación de CLM.
5. El tono debe ser profesional, constructivo y pedagógico.

Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{ "reports": [ { "studentName": "...", "report": "..." }, ... ] }`;

    const studentsInfo = students.map((s: any) => {
      let info = `${s.name}: ${s.grade !== null && s.grade !== undefined ? s.grade.toFixed(2) : 'No evaluado'}`;
      if (s.markers?.repeater) info += ' [REPETIDOR]';
      if (s.markers?.failedSubjects?.length > 0) {
        info += ` [Áreas suspensas anteriores: ${s.markers.failedSubjects.map((f: any) => f.areaName).join(', ')}]`;
      }
      if (s.markers?.deficit?.length > 0) {
        info += ` [Necesidades: ${s.markers.deficit.map((d: any) => d.type).join(', ')}]`;
      }
      return info;
    }).join('\n');

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
          { role: "user", content: `Alumnos:\n${studentsInfo}` },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de peticiones excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const braceMatch = content.match(/\{[\s\S]*\}/);
      if (braceMatch) parsed = JSON.parse(braceMatch[0]);
      else throw new Error("No se pudo parsear la respuesta de la IA");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-student-reports error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
