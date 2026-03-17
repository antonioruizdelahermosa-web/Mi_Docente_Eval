export interface FailedSubject {
  areaId: string;
  areaName: string;
  level: "insuficiente" | "muy_insuficiente";
}

export interface StudentMarkers {
  failedSubjects?: FailedSubject[];
  repeater?: boolean;
  deficit?: { type: string }[];
}

export interface StudentRow {
  id: number;
  name: string;
  grades: Record<string, number | null>;
  markers?: StudentMarkers;
}

export interface Area {
  id: string;
  name: string;
}

export const DEFAULT_AREAS: Area[] = [
  { id: "lengua", name: "Lengua" },
  { id: "matematicas", name: "Matemáticas" },
  { id: "cmedio", name: "C. del Medio" },
  { id: "plastica", name: "Plástica" },
  { id: "ingles", name: "Inglés" },
  { id: "ef", name: "Ed. Física" },
];

export function getGradeLabel(value: number | null): string {
  if (value === null || value === undefined) return "";
  if (value < 4.5) return "Ins.";
  if (value <= 5.75) return "Suf.";
  if (value <= 6.99) return "Bien";
  if (value <= 8.5) return "Not.";
  return "Sob.";
}

export type GradeCategory = 'insuficiente' | 'suficiente' | 'bien' | 'notable' | 'sobresaliente' | 'empty';

export function getGradeCategory(value: number | null): GradeCategory {
  if (value === null || value === undefined) return 'empty';
  if (value < 4.5) return 'insuficiente';
  if (value <= 5.75) return 'suficiente';
  if (value <= 6.99) return 'bien';
  if (value <= 8.5) return 'notable';
  return 'sobresaliente';
}

export function getGradeCategoryLabel(cat: GradeCategory): string {
  const labels: Record<GradeCategory, string> = {
    insuficiente: 'Insuficiente', suficiente: 'Suficiente', bien: 'Bien',
    notable: 'Notable', sobresaliente: 'Sobresaliente', empty: 'No evaluado',
  };
  return labels[cat];
}

export function getGradeColor(cat: GradeCategory): string {
  const colors: Record<GradeCategory, string> = {
    insuficiente: '#dc2626', suficiente: '#f97316', bien: '#eab308',
    notable: '#3b82f6', sobresaliente: '#16a34a', empty: '#9ca3af',
  };
  return colors[cat];
}

export function getGradeClass(value: number | null): string {
  if (value === null || value === undefined) return "";
  if (value < 4.5) return "grade-ins";
  if (value <= 5.75) return "grade-suf";
  if (value <= 6.99) return "grade-bien";
  if (value <= 8.5) return "grade-not";
  return "grade-sob";
}

export function calculateAverage(grades: Record<string, number | null>, areaIds: string[]): number | null {
  const valid = areaIds.map(id => grades[id]).filter((v): v is number => v !== null && v !== undefined);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function getSubjectAverage(students: StudentRow[], areaId: string): number | null {
  const valid = students.map(s => s.grades[areaId]).filter((v): v is number => v !== null && v !== undefined);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function getGradeDistribution(students: StudentRow[], areaId: string): Record<GradeCategory, number> {
  const dist: Record<GradeCategory, number> = { insuficiente: 0, suficiente: 0, bien: 0, notable: 0, sobresaliente: 0, empty: 0 };
  students.forEach(s => { dist[getGradeCategory(s.grades[areaId] ?? null)]++; });
  return dist;
}

// Multiple comment variants per category so areas with the same grade get different texts
const COMMENT_VARIANTS: Record<string, string[]> = {
  sobresaliente: [
    `{name} demuestra un dominio excelente en {area}, con una comprensión profunda de los contenidos y una capacidad destacada para aplicar los conocimientos adquiridos en situaciones diversas.`,
    `{name} sobresale en {area}, evidenciando un nivel competencial muy alto y una actitud ejemplar hacia el aprendizaje. Su participación activa y su capacidad de análisis son dignas de mención.`,
    `En {area}, {name} alcanza un rendimiento sobresaliente, mostrando autonomía, rigor y creatividad en la resolución de tareas. Se le anima a seguir profundizando en los contenidos.`,
    `{name} destaca notablemente en {area}, reflejando una asimilación sólida de los contenidos y una gran capacidad para transferir lo aprendido a contextos nuevos.`,
    `El desempeño de {name} en {area} es excepcional, con un manejo seguro de los contenidos curriculares y una implicación constante en las actividades del aula.`,
    `{name} exhibe un nivel sobresaliente en {area}, combinando esfuerzo, interés y una capacidad analítica que le permite abordar con éxito tareas de mayor complejidad.`,
  ],
  notable: [
    `{name} muestra un buen nivel de desempeño en {area}, asimilando los contenidos con soltura y demostrando interés por las actividades propuestas.`,
    `En {area}, {name} obtiene un rendimiento notable, con una buena comprensión de los contenidos y una participación activa en el aula. Puede aspirar a la excelencia con un poco más de constancia.`,
    `{name} demuestra un nivel notable en {area}, trabajando con regularidad y alcanzando los objetivos con holgura. Se recomienda profundizar en los aspectos que presentan menor consolidación.`,
    `El trabajo de {name} en {area} refleja un nivel notable, con buena predisposición y capacidad para seguir las explicaciones y realizar las tareas de forma autónoma.`,
    `{name} presenta un rendimiento notable en {area}, mostrando solidez en la mayoría de los contenidos y una actitud positiva que favorece su progreso académico.`,
    `En {area}, {name} alcanza un nivel notable gracias a su esfuerzo continuo y su capacidad para relacionar conceptos de forma coherente.`,
  ],
  bien: [
    `{name} alcanza un nivel adecuado en {area}, cumpliendo con los objetivos de forma satisfactoria. Existe margen de mejora con mayor dedicación.`,
    `En {area}, {name} consigue resultados satisfactorios, aunque podría mejorar su rendimiento dedicando más tiempo al repaso y la práctica de los contenidos trabajados.`,
    `{name} obtiene un nivel aceptable en {area}. Si bien cumple los objetivos básicos, un mayor esfuerzo en las tareas diarias le permitiría alcanzar mejores resultados.`,
    `El desempeño de {name} en {area} es correcto, mostrando comprensión de los contenidos fundamentales. Se anima a reforzar el estudio para consolidar los aprendizajes.`,
    `{name} muestra un rendimiento adecuado en {area}, con resultados que, aunque positivos, podrían mejorar con una mayor implicación en las actividades complementarias.`,
    `En {area}, {name} alcanza un nivel de bien, demostrando que posee las competencias básicas pero necesita un impulso adicional para destacar.`,
  ],
  suficiente: [
    `{name} logra alcanzar los objetivos mínimos en {area}, aunque con dificultades que requieren atención y refuerzo.`,
    `En {area}, {name} obtiene un resultado suficiente. Es necesario que intensifique el trabajo diario y dedique más tiempo al estudio para consolidar los aprendizajes básicos.`,
    `{name} aprueba {area} de manera justa. Se recomienda un plan de refuerzo y mayor seguimiento para asegurar la adquisición de las competencias fundamentales.`,
    `El rendimiento de {name} en {area} es suficiente, lo que indica que comprende los conceptos básicos pero necesita mayor práctica y dedicación para afianzarlos.`,
    `{name} alcanza los mínimos en {area}, aunque se observan lagunas que conviene abordar con actividades de repaso y apoyo individualizado.`,
    `En {area}, {name} obtiene un suficiente que refleja un esfuerzo mejorable. Con mayor constancia y trabajo adicional, podrá superar las dificultades detectadas.`,
  ],
  insuficiente: [
    `{name} no alcanza los objetivos mínimos en {area}. Es necesario implementar medidas de refuerzo educativo.`,
    `En {area}, {name} presenta un rendimiento insuficiente. Se requiere una intervención específica con actividades adaptadas que le permitan superar las carencias detectadas.`,
    `{name} muestra dificultades importantes en {area} que le impiden alcanzar los objetivos básicos. Se recomienda refuerzo educativo y coordinación con la familia.`,
    `El desempeño de {name} en {area} está por debajo de los mínimos establecidos. Es imprescindible aplicar medidas de apoyo y seguimiento continuo.`,
    `{name} no supera los objetivos en {area}. Se aconseja trabajar con materiales de refuerzo y establecer un plan de recuperación adaptado a sus necesidades.`,
    `En {area}, {name} obtiene un resultado insuficiente que evidencia carencias significativas. La colaboración entre el centro y la familia será clave para su mejora.`,
  ],
};

/**
 * Generates a unique comment for each area, using variant index to avoid repetition
 * when multiple areas share the same grade category.
 */
export function generateSubjectComment(student: StudentRow, area: Area, variantIndex: number = 0): string {
  const name = student.name || 'El/La alumno/a';
  const val = student.grades[area.id];
  if (val === null || val === undefined) return `No se dispone de calificación en ${area.name} para este período.`;
  const cat = getGradeCategory(val);
  if (cat === 'empty') return `No se dispone de calificación en ${area.name} para este período.`;
  const variants = COMMENT_VARIANTS[cat] || [];
  const template = variants[variantIndex % variants.length] || '';
  return template.replace(/\{name\}/g, name).replace(/\{area\}/g, area.name);
}

/**
 * For a student, generates all area comments with automatic variant selection
 * so areas with the same category get different texts.
 */
export function generateAllSubjectComments(student: StudentRow, areas: Area[]): Record<string, string> {
  // Track how many times each category has appeared to pick the next variant
  const catCounter: Record<string, number> = {};
  const comments: Record<string, string> = {};
  for (const area of areas) {
    const val = student.grades[area.id];
    const cat = getGradeCategory(val ?? null);
    if (!catCounter[cat]) catCounter[cat] = 0;
    comments[area.id] = generateSubjectComment(student, area, catCounter[cat]);
    catCounter[cat]++;
  }
  return comments;
}

export function generateGroupPedagogicalComment(students: StudentRow[], areas: Area[]): string {
  const evaluated = students.filter(s => s.name.trim());
  if (evaluated.length === 0) return 'No hay alumnos evaluados en este período.';

  const subjectStats = areas.map(a => {
    const avg = getSubjectAverage(evaluated, a.id);
    const dist = getGradeDistribution(evaluated, a.id);
    return { area: a, avg, dist };
  }).filter(s => s.avg !== null);

  const globalAvgs = subjectStats.map(s => s.avg!);
  const globalAvg = globalAvgs.length > 0 ? globalAvgs.reduce((a, b) => a + b, 0) / globalAvgs.length : null;

  const bestAreas = subjectStats.filter(s => s.avg! >= 7).map(s => s.area.name);
  const weakAreas = subjectStats.filter(s => s.avg! < 5).map(s => s.area.name);

  let comment = `El grupo está compuesto por ${evaluated.length} alumnos evaluados en ${subjectStats.length} áreas curriculares. `;
  if (globalAvg !== null) {
    comment += `La media global se sitúa en un ${globalAvg.toFixed(2)}, nivel de ${getGradeCategoryLabel(getGradeCategory(globalAvg)).toLowerCase()}. `;
  }
  if (bestAreas.length > 0) comment += `Destacan positivamente: ${bestAreas.join(', ')}. `;
  if (weakAreas.length > 0) comment += `Requieren refuerzo: ${weakAreas.join(', ')}. `;
  comment += `Se recomienda mantener metodologías activas y comunicación con las familias.`;
  return comment;
}

export function createEmptyStudents(count: number, areas: Area[]): StudentRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: "",
    grades: Object.fromEntries(areas.map((a) => [a.id, null])),
  }));
}

export function generateStudentReport(student: StudentRow, areas: Area[], course?: string): string {
  const validGrades = areas
    .map((a) => ({ area: a.name, grade: student.grades[a.id] }))
    .filter((g) => g.grade !== null && g.grade !== undefined);

  if (validGrades.length === 0) {
    return `${student.name} no tiene calificaciones registradas en este periodo.`;
  }

  const avg = validGrades.reduce((sum, g) => sum + (g.grade ?? 0), 0) / validGrades.length;
  const label = getGradeLabel(avg);
  const markers = student.markers || {};

  const strengths = validGrades.filter((g) => (g.grade ?? 0) >= 7).map((g) => g.area);
  const weaknesses = validGrades.filter((g) => (g.grade ?? 0) < 5).map((g) => g.area);

  let report = `INFORME INDIVIDUAL — ${student.name}\n\n`;
  report += `Rendimiento medio: ${avg.toFixed(2)} (${label})\n\n`;
  report += `Calificaciones:\n`;
  validGrades.forEach((g) => {
    report += `  • ${g.area}: ${g.grade?.toFixed(2)} — ${getGradeLabel(g.grade ?? 0)}\n`;
  });

  // Markers info
  if (markers.repeater) {
    report += `\n⚠ ALUMNO REPETIDOR: El alumno/a es repetidor/a. De acuerdo con la normativa de Castilla-La Mancha (Decreto 81/2022), se deben aplicar medidas de refuerzo y acompañamiento personalizado.\n`;
  }
  if (markers.failedSubjects && markers.failedSubjects.length > 0) {
    report += `\n⚠ ÁREAS SUSPENSAS DE CURSOS ANTERIORES:\n`;
    markers.failedSubjects.forEach(fs => {
      report += `  • ${fs.areaName} — Nivel: ${fs.level === 'muy_insuficiente' ? 'Muy insuficiente' : 'Insuficiente'}\n`;
    });
    report += `  Según la Resolución de 26/01/2019 de la Consejería de Educación de CLM, se requiere la elaboración de un Plan de Trabajo con medidas individualizadas de inclusión educativa.\n`;
  }
  if (markers.deficit && markers.deficit.length > 0) {
    report += `\n⚠ NECESIDADES ESPECÍFICAS:\n`;
    markers.deficit.forEach(d => {
      report += `  • ${d.type}\n`;
    });
    report += `  Conforme a la legislación de inclusión educativa de Castilla-La Mancha (Decreto 85/2018), el alumno/a requiere medidas de inclusión educativa adaptadas a sus necesidades.\n`;
  }

  if (strengths.length > 0) {
    report += `\nPuntos fuertes: ${strengths.join(", ")}. El alumno/a demuestra un nivel competencial destacado en ${strengths.length > 1 ? "estas áreas" : "esta área"}, lo que refleja un buen dominio de los contenidos y competencias asociadas.\n`;
  }
  if (weaknesses.length > 0) {
    report += `\nÁreas de mejora: ${weaknesses.join(", ")}. Se recomienda reforzar el trabajo en ${weaknesses.length > 1 ? "estas materias" : "esta materia"} mediante actividades de apoyo y seguimiento individualizado.\n`;
  }

  report += `\nObservaciones generales: `;
  if (avg >= 7) {
    report += `El alumno/a mantiene un rendimiento académico satisfactorio, mostrando interés y participación activa en las actividades propuestas.`;
  } else if (avg >= 5) {
    report += `El alumno/a alcanza los objetivos mínimos establecidos. Se anima a mejorar el hábito de estudio y la constancia en la realización de tareas.`;
  } else {
    report += `El alumno/a presenta dificultades para alcanzar los objetivos mínimos. Se recomienda la adopción de medidas de refuerzo educativo y una comunicación estrecha con la familia.`;
  }

  // Plan de Trabajo section for students with markers
  if (needsPlanDeTrabajo(student)) {
    report += `\n\n${"=".repeat(60)}\nPLAN DE TRABAJO — MEDIDAS INDIVIDUALIZADAS DE INCLUSIÓN EDUCATIVA\n(Resolución 26/01/2019 — Consejería de Educación, Cultura y Deportes de CLM)\n${"=".repeat(60)}\n`;
    report += generatePlanDeTrabajo(student, areas, course);
  }

  return report;
}

export function needsPlanDeTrabajo(student: StudentRow): boolean {
  const m = student.markers || {};
  return !!(m.repeater || (m.failedSubjects && m.failedSubjects.length > 0) || (m.deficit && m.deficit.length > 0));
}

function generatePlanDeTrabajo(student: StudentRow, areas: Area[], course?: string): string {
  const markers = student.markers || {};
  const failedAreas = markers.failedSubjects || [];
  const deficits = markers.deficit || [];
  const currentFailedAreas = areas.filter(a => {
    const grade = student.grades[a.id];
    return grade !== null && grade !== undefined && grade < 5;
  });

  let plan = "";

  // A) Datos relevantes
  plan += `\nA) DATOS RELEVANTES DEL ALUMNO/A\n`;
  plan += `Alumno/a: ${student.name}\n`;
  if (course) plan += `Curso: ${course}\n`;
  plan += `Ha repetido curso: ${markers.repeater ? 'SÍ' : 'NO'}\n`;
  if (failedAreas.length > 0) {
    plan += `Áreas no superadas de niveles anteriores: ${failedAreas.map(f => f.areaName).join(', ')}\n`;
  }
  if (deficits.length > 0) {
    plan += `Necesidades específicas: ${deficits.map(d => d.type).join(', ')}\n`;
  }

  // B) Medidas de inclusión educativa
  plan += `\nB) MEDIDAS DE INCLUSIÓN EDUCATIVA PREVISTAS\n`;

  // Medidas a nivel de aula
  plan += `\nMEDIDAS DE INCLUSIÓN EDUCATIVA A NIVEL DE AULA:\n`;
  plan += `• Adaptación de la organización temporal del aula: tiempo flexible para la realización de actividades.\n`;
  plan += `• Estrategias metodológicas diversificadas: aprendizaje cooperativo, tutoría entre iguales, instrucción directa adaptada.\n`;
  plan += `• Adaptación de materiales: uso de recursos visuales, manipulativos y tecnológicos como apoyo.\n`;
  plan += `• Agrupamientos flexibles para facilitar la interacción y el aprendizaje.\n`;

  // Medidas individualizadas
  plan += `\nMEDIDAS DE INCLUSIÓN EDUCATIVA INDIVIDUALIZADAS:\n`;

  if (deficits.length > 0) {
    deficits.forEach(d => {
      plan += `\n  Déficit: ${d.type}\n`;
      plan += `  • Adaptaciones de acceso: provisión de recursos específicos según necesidad.\n`;
      plan += `  • Adaptaciones metodológicas: enseñanza guiada, modelado, autoinstrucciones.\n`;
      plan += `  • Programas específicos de intervención adaptados al tipo de déficit.\n`;
    });
  }

  // Por áreas
  const areasToAddress = [
    ...currentFailedAreas.map(a => ({ area: a, source: 'actual' as const })),
    ...failedAreas
      .filter(f => !currentFailedAreas.some(ca => ca.id === f.areaId))
      .map(f => ({ area: areas.find(a => a.id === f.areaId) || { id: f.areaId, name: f.areaName }, source: 'anterior' as const })),
  ];

  if (areasToAddress.length > 0) {
    plan += `\nADAPTACIONES METODOLÓGICAS POR ÁREAS:\n`;
    areasToAddress.forEach(({ area, source }) => {
      const grade = student.grades[area.id];
      plan += `\n${area.name.toUpperCase()}${source === 'anterior' ? ' (suspensa de curso anterior)' : ''}:\n`;
      if (grade !== null && grade !== undefined) {
        plan += `  Calificación actual: ${grade.toFixed(2)} — ${getGradeLabel(grade)}\n`;
      }
      plan += generateAreaMethodology(area.name);
    });
  }

  // Evaluación
  plan += `\nPROCEDIMIENTOS, TÉCNICAS E INSTRUMENTOS DE EVALUACIÓN:\n`;
  plan += `• Observación directa y sistemática durante la realización de tareas.\n`;
  plan += `• Pruebas escritas adaptadas al nivel de competencia curricular del alumno/a.\n`;
  plan += `• Producciones del alumno/a: cuadernos, trabajos, fichas específicas.\n`;
  plan += `• Control oral de contenidos y conceptos clave.\n`;
  plan += `• Rúbricas y escalas de valoración ajustadas a los criterios de evaluación adaptados.\n`;
  plan += `• Se proporcionará tiempo adicional para la realización de pruebas cuando sea necesario.\n`;

  // Seguimiento
  plan += `\nSEGUIMIENTO Y EVALUACIÓN DEL PLAN:\n`;
  plan += `• Revisión trimestral de los progresos alcanzados.\n`;
  plan += `• Coordinación con el Equipo de Orientación y Apoyo.\n`;
  plan += `• Comunicación periódica con las familias sobre la evolución del alumno/a.\n`;
  plan += `• Ajuste de las medidas según los resultados obtenidos en cada evaluación.\n`;

  return plan;
}

function generateAreaMethodology(areaName: string): string {
  const lower = areaName.toLowerCase();
  if (lower.includes('lengua')) {
    return `  1. Apoyo visual: utilizar imágenes o pictogramas junto con el texto para facilitar la comprensión.
  2. Textos simplificados y fragmentados: dividir los textos en párrafos cortos y trabajar la comprensión por secciones.
  3. Actividades de relación: ejercicios para relacionar conceptos clave con imágenes o frases.
  4. Refuerzo de la expresión escrita mediante modelos guiados y plantillas.\n`;
  }
  if (lower.includes('matem')) {
    return `  1. Ejercicios paso a paso: problemas desglosados en pasos secuenciales con ilustraciones guía.
  2. Material manipulativo: objetos físicos para representar operaciones matemáticas.
  3. Refuerzos visuales: esquemas, gráficos y colores para comprender cada tipo de ejercicio.
  4. Adaptación del nivel de complejidad de los problemas al nivel competencial del alumno/a.\n`;
  }
  if (lower.includes('medio') || lower.includes('natural') || lower.includes('social')) {
    return `  1. Organizadores gráficos: mapas conceptuales o diagramas para visualizar la estructura del contenido.
  2. Experiencias prácticas: actividades experimentales o de observación directa.
  3. Preguntas de comprensión directas al finalizar cada bloque de contenido.
  4. Uso de material audiovisual como apoyo a la explicación.\n`;
  }
  if (lower.includes('inglés') || lower.includes('ingles')) {
    return `  1. Uso de recursos audiovisuales y digitales (flash cards, audios, juegos interactivos).
  2. Instrucciones sencillas y apoyo visual con pictogramas.
  3. Trabajo con vocabulario básico a través de actividades lúdicas.
  4. Evaluación oral mediante observación directa y participación guiada.\n`;
  }
  if (lower.includes('física') || lower.includes('fisica')) {
    return `  1. Enseñanza guiada con explicaciones cortas y ejemplos visuales.
  2. Simplificación de instrucciones y variación continua de actividades.
  3. Uso del refuerzo positivo y agrupamientos inclusivos.
  4. Adaptación de las actividades motrices al nivel del alumno/a.\n`;
  }
  if (lower.includes('plástica') || lower.includes('plastica') || lower.includes('artística') || lower.includes('artistica') || lower.includes('música') || lower.includes('musica')) {
    return `  1. Modelado y ejemplos visuales antes de cada actividad.
  2. Instrucciones con pictogramas o ilustraciones por fases.
  3. Actividades en secuencias cortas para mantener la atención.
  4. Exploración libre con materiales adaptados.\n`;
  }
  // Generic
  return `  1. Adaptación de contenidos al nivel de competencia curricular del alumno/a.
  2. Uso de recursos visuales y manipulativos como apoyo.
  3. Enseñanza guiada con instrucciones claras y secuenciadas.
  4. Evaluación adaptada con instrumentos diversificados.\n`;
}

export function generateGroupReport(students: StudentRow[], areas: Area[]): string {
  const studentsWithGrades = students.filter(
    (s) => s.name.trim() && areas.some((a) => s.grades[a.id] !== null && s.grades[a.id] !== undefined)
  );

  if (studentsWithGrades.length === 0) {
    return "No hay datos suficientes para generar un informe grupal.";
  }

  let report = `INFORME GRUPAL DE RENDIMIENTO\n`;
  report += `Alumnos evaluados: ${studentsWithGrades.length}\n\n`;

  report += `MEDIAS POR ÁREA:\n`;
  areas.forEach((area) => {
    const grades = studentsWithGrades
      .map((s) => s.grades[area.id])
      .filter((g): g is number => g !== null && g !== undefined);
    if (grades.length > 0) {
      const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
      report += `  • ${area.name}: ${avg.toFixed(2)} (${getGradeLabel(avg)}) — ${grades.length} alumnos evaluados\n`;
    }
  });

  report += `\nDISTRIBUCIÓN GENERAL:\n`;
  const allGrades = studentsWithGrades.flatMap((s) =>
    areas.map((a) => s.grades[a.id]).filter((g): g is number => g !== null && g !== undefined)
  );
  const globalAvg = allGrades.reduce((a, b) => a + b, 0) / allGrades.length;
  report += `  Media global: ${globalAvg.toFixed(2)} (${getGradeLabel(globalAvg)})\n`;

  const categories = { "Insuficiente": 0, "Suficiente": 0, "Bien": 0, "Notable": 0, "Sobresaliente": 0 };
  allGrades.forEach((g) => {
    if (g < 4.5) categories["Insuficiente"]++;
    else if (g <= 5.75) categories["Suficiente"]++;
    else if (g <= 6.99) categories["Bien"]++;
    else if (g <= 8.5) categories["Notable"]++;
    else categories["Sobresaliente"]++;
  });

  Object.entries(categories).forEach(([cat, count]) => {
    const pct = ((count / allGrades.length) * 100).toFixed(1);
    report += `  ${cat}: ${count} (${pct}%)\n`;
  });

  report += `\nOBSERVACIONES PEDAGÓGICAS:\n`;
  if (globalAvg >= 7) {
    report += `El grupo presenta un rendimiento global satisfactorio. Se recomienda mantener las estrategias didácticas actuales y proponer actividades de ampliación para los alumnos con mejor rendimiento.\n`;
  } else if (globalAvg >= 5) {
    report += `El rendimiento del grupo es adecuado, aunque existen diferencias significativas entre alumnos. Conviene diversificar las estrategias metodológicas y reforzar la atención individualizada.\n`;
  } else {
    report += `El grupo presenta un rendimiento por debajo de lo esperado. Se recomienda revisar la programación didáctica, implementar medidas de refuerzo grupales y coordinar actuaciones con el equipo de orientación.\n`;
  }

  return report;
}
