const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  pdfParse = null;
}

let cachedCvText = null;
let cvLoadPromise = null;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeWhitespace(str) {
  return String(str).replace(/\r\n?|\n/g, '\n').replace(/\s{2,}/g, ' ').trim();
}

function truncate(str, max = 12000) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '... [truncado]' : str;
}

async function getCvText() {
  if (cachedCvText) return cachedCvText;
  if (cvLoadPromise) return cvLoadPromise;

  cvLoadPromise = (async () => {
    try {
      const cvPath = path.join(process.cwd(), 'public', 'CV25_CARDONA.pdf');
      const exists = await fs.promises
        .access(cvPath, fs.constants.R_OK)
        .then(() => true)
        .catch(() => false);
      if (!exists) return null;

      if (!pdfParse) return null;

      const dataBuffer = await fs.promises.readFile(cvPath);
      const parsed = await pdfParse(dataBuffer);
      const text = normalizeWhitespace(parsed.text || '');
      cachedCvText = text;
      return cachedCvText;
    } catch (e) {
      console.error('No se pudo cargar/parsing el CV:', e);
      return null;
    }
  })();

  return cvLoadPromise;
}

// Detecta si el mensaje requiere inyectar el CV (solo para detalles específicos)
function needsCvInjection(msg) {
  if (!msg) return false;
  const text = String(msg).toLowerCase();
  const triggers = [
    // CV explícito - cuando el usuario PIDE ver el CV
    'ver el cv', 'ver cv', 'muestra el cv', 'muéstrame el cv',
    'revisar el cv', 'lee el cv', 'leer el cv', 'consulta el cv',
    'mi cv', 'curriculum', 'currículum', 'hoja de vida',
    // Fechas específicas y detalles temporales
    'fecha', 'cuando', 'cuándo', 'año', 'periodo', 'tiempo trabajaste',
    'cuanto tiempo', 'cuánto tiempo', 'inicio', 'finalizo', 'finalizó',
    'empezó', 'empezo', 'terminó', 'termino',
    // Experiencia laboral con contexto de historial
    'últimos trabajos', 'ultimos trabajos', 'trabajos anteriores',
    'historial laboral', 'donde trabajaste', 'dónde trabajaste',
    'empleos anteriores', 'experiencia laboral completa',
    // Métricas y logros específicos
    'porcentaje', '%', 'métrica', 'metricas', 'logro', 'logros', 'reducir',
    'mejorar', 'incrementar', 'aumentar', 'eficiencia', 'resultados',
    // Datos personales muy específicos
    'nacimiento', 'edad', 'identidad', 'dni', 'cedula', 'cédula',
    'estado civil', 'nacionalidad',
    // Detalles técnicos muy específicos del CV
    'metodología', 'metodologías', 'scrum', 'agile',
    'herramientas devops', 'orm', 'sequelize', 'prisma'
  ];
  return triggers.some(t => text.includes(t));
}

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Manejar preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Solo aceptar método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Método no permitido' 
    });
  }

  try {
    // Validar que la API key esté configurada
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        success: false,
        error: 'API key no configurada' 
      });
    }

    // Inicializar OpenAI con la API key desde las variables de entorno
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { message, conversationHistory = [] } = req.body;

    // Validar que el mensaje exista
    if (!message || message.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'El mensaje no puede estar vacío' 
      });
    }

    // Armar prompt del sistema (HTML) con contenido del portafolio SIEMPRE
    const systemBase = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Asistente IA del Portafolio</title>
  <meta name="domain" content="Portafolio de Luis Enrique Cardona Castro" />
  <meta name="behavior" content="Respuestas breves, profesionales, en español, máx 20 palabras" />
  <style>pre{white-space:pre-wrap}</style>
</head>
<body>
  <section id="assistant-role">
    <h1>Instrucciones del Asistente</h1>
    <ul>
      <li><strong>Rol:</strong> Asistente virtual del portafolio de Luis Enrique Cardona Castro (Full Stack Developer, Honduras).</li>
      <li><strong>Prioridad de Respuesta (CRÍTICO):</strong>
        <ol>
          <li><strong>PRIMERO (Fuente Principal):</strong> Responde usando la sección "portfolio-content". Contiene proyectos actuales, habilidades, educación básica y contacto.</li>
          <li><strong>SEGUNDO (Detalles Específicos):</strong> Si el usuario pregunta por fechas exactas, historial laboral completo, métricas, logros específicos, o dice explícitamente "ver el CV"/"curriculum", consulta la sección "curriculum" SI ESTÁ DISPONIBLE.</li>
          <li><strong>NUNCA:</strong> No inventes, no supongas, no agregues información que no esté en las secciones. Si no encuentras la respuesta, di "No tengo esa información específica".</li>
        </ol>
      </li>
      <li><strong>Cuándo usar cada sección:</strong>
        <ul>
          <li>"¿Qué proyectos?", "¿Qué habilidades?", "¿Dónde estudió?" → <strong>portfolio-content</strong></li>
          <li>"¿Cuándo trabajó en ANSEC?", "Muéstrame el CV", "Últimos 3 trabajos" → <strong>curriculum</strong></li>
        </ul>
      </li>
      <li><strong>Estilo:</strong> Amigable, profesional, conciso. Máximo 20 palabras. Emojis ocasionales. Preguntas aclaratorias si ambiguo.</li>
      <li><strong>Políticas:</strong> No revelar proveedor de IA; no salirse del contexto del portafolio.</li>
      <li><strong>Contratación:</strong> Email: kikecar97@gmail.com | WhatsApp: +504 3348-1474</li>
    </ul>
  </section>
  
  <section id="portfolio-content" data-priority="1">
    <h2>Contenido del Portafolio (Fuente Principal)</h2>
    
    <article id="proyectos">
      <h3>Proyectos Realizados</h3>
      <ul>
        <li><strong>2026 - APP Móvil ANSEC:</strong> Diseño, desarrollo e implementación de app oficial de solicitudes para Play Store y AppGallery.</li>
        <li><strong>2025 - Módulo Solicitudes ANSEC:</strong> Sistema completo de solicitudes para empleados de ANSEC.</li>
        <li><strong>2025 - Sistema Almacén SEDH:</strong> Gestión de almacén para Secretaría de Derechos Humanos.</li>
        <li><strong>2025 - Página Web SEDH:</strong> Sitio oficial responsive de la Secretaría de Derechos Humanos (www.sedh.gob.hn).</li>
        <li><strong>2025 - Sistema Permisos SEDH:</strong> BaseDatos, BackEnd, FrontEnd para gestión de permisos de empleados.</li>
        <li><strong>2024 - Benchmark Honduras:</strong> Sistema de comparación de vehículos con análisis estadísticos y exportación a Excel/PDF.</li>
        <li><strong>2024 - Veterinaria AgroComercial El Campo:</strong> Sistema interno de consultas, formularios y citas veterinarias.</li>
        <li><strong>2023 - Sambo/King Boxing Honduras:</strong> Sistema completo con landing page, administración, roles y gestión de estudiantes/maestros.</li>
      </ul>
    </article>
    
    <article id="habilidades">
      <h3>Habilidades Técnicas</h3>
      <p><strong>Frontend:</strong> HTML/CSS, React, Angular, Vue, Xamarin, Ionic, Bootstrap, TailwindCSS, jQuery, TypeScript, JavaScript</p>
      <p><strong>Backend:</strong> Node.js, .NET, PHP, Java, Python</p>
      <p><strong>Bases de Datos:</strong> SQL, MySQL, PostgreSQL, Oracle</p>
      <p><strong>DevOps/Herramientas:</strong> Git, Docker, AWS</p>
    </article>
    
    <article id="educacion">
      <h3>Educación</h3>
      <ul>
        <li><strong>Instituto San José Del Pedregal:</strong> Técnico en Informática</li>
        <li><strong>Universidad Nacional Autónoma de Honduras (UNAH):</strong> Licenciatura en Informática</li>
        <li><strong>Universidad UNITEC:</strong> Desarrollo de Aplicaciones Web y Móvil</li>
        <li><strong>Universidad UNITEC:</strong> Ingeniería en Sistemas</li>
      </ul>
    </article>
    
    <article id="certificaciones">
      <h3>Cursos y Certificaciones</h3>
      <p>Node.js Pro, APIs Django, APIs Python, Django, Microservicios, POO Python, Python Avanzado, Python Básico, Web Scraping (Python/Node)</p>
    </article>
    
    <article id="contacto">
      <h3>Contacto y Redes</h3>
      <ul>
        <li><strong>Ubicación:</strong> Jardines de Toncontín, Tegucigalpa, Honduras</li>
        <li><strong>Teléfono:</strong> +504 3348-1474</li>
        <li><strong>Email:</strong> kikecar97@gmail.com</li>
        <li><strong>Redes:</strong> LinkedIn (cardona97), GitHub, Instagram, Facebook, Twitter</li>
      </ul>
    </article>
  </section>`;

    let systemHtml = systemBase;
    if (needsCvInjection(message)) {
      const cvText = await getCvText();
      systemHtml += `
  
  <section id="curriculum" data-priority="2" data-source="public/CV25_CARDONA.pdf" data-loaded="${cvText ? 'true' : 'false'}">
    <h2>Currículum Detallado (Solo para Detalles Específicos)</h2>
    <p><strong>IMPORTANTE:</strong> Usa esta sección SOLO si "portfolio-content" no tiene la información solicitada (fechas exactas, métricas, datos personales específicos, detalles técnicos avanzados).</p>
    ${cvText ? `<pre>${escapeHtml(truncate(cvText, 10000))}</pre>` : '<p>No disponible en este momento.</p>'}
  </section>`;
    }
    systemHtml += `
</body>
</html>`;

    const userHtml = `<message>
  <header>
    <source>usuario</source>
    <lang>es</lang>
  </header>
  <content>${escapeHtml(String(message))}</content>
</message>`;

    const messages = [
      { role: 'system', content: systemHtml },
      ...conversationHistory,
      { role: 'user', content: userHtml }
    ];

    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0].message.content;

    // Retornar la respuesta
    return res.status(200).json({
      success: true,
      reply: reply,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en chat API:', error);
    console.error('Error completo:', JSON.stringify(error, null, 2));
    
    // Manejar diferentes tipos de errores
    if (error.status === 401) {
      return res.status(401).json({ 
        success: false,
        error: 'API key inválida' 
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ 
        success: false,
        error: 'Límite de solicitudes excedido. Intenta más tarde.' 
      });
    }

    return res.status(500).json({ 
      success: false,
      error: 'Error al procesar la solicitud',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
    });
  }
}
