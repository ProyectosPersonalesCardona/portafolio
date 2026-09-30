# 🚀 Portafolio de Luis Enrique Cardona Castro

Portafolio personal con chatbot inteligente integrado usando OpenAI API.

## 📋 Características

- ✅ Diseño responsive con Bootstrap 5
- ✅ Chat IA integrado con OpenAI GPT-3.5
- ✅ Galería de proyectos y diplomas
- ✅ Información de contacto y redes sociales
- ✅ Serverless functions con Vercel

## 🛠️ Tecnologías

- HTML5 / CSS3 / JavaScript
- Bootstrap 5.3.3
- OpenAI API (GPT-3.5-turbo)
- Vercel Serverless Functions

## 📦 Instalación Local

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/mi-portafolio.git
   cd mi-portafolio
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Edita el archivo `.env` y agrega tu API key de OpenAI:
   ```
   OPENAI_API_KEY=sk-tu-api-key-aqui
   ```

4. **Ejecuta en modo desarrollo**
   ```bash
   npm run dev
   ```

5. **Abre en el navegador**
   ```
   http://localhost:3000
   ```

## 🌐 Deployment en Vercel

### Opción 1: Desde el Dashboard de Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Click en **"Add New Project"**
3. Importa tu repositorio de GitHub
4. Configura las variables de entorno:
   - Ve a **Settings** → **Environment Variables**
   - Agrega `OPENAI_API_KEY` con tu API key
5. Click en **Deploy**

### Opción 2: Desde la CLI

1. **Instala Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Inicia sesión**
   ```bash
   vercel login
   ```

3. **Configura las variables de entorno**
   ```bash
   vercel env add OPENAI_API_KEY
   ```
   Pega tu API key cuando te lo pida.

4. **Deploy**
   ```bash
   vercel --prod
   ```

## 🔑 Obtener tu API Key de OpenAI

1. Regístrate en [OpenAI Platform](https://platform.openai.com)
2. Ve a [API Keys](https://platform.openai.com/api-keys)
3. Click en **"Create new secret key"**
4. Copia la key (solo la verás una vez)
5. Agrégala a las variables de entorno de Vercel

⚠️ **Importante:** 
- Nunca compartas tu API key
- Nunca la subas a GitHub
- Configúrala solo en las variables de entorno de Vercel

## 💰 Costos

- **Vercel:** Gratis para proyectos personales
- **OpenAI API:** 
  - Primeros $5 de crédito gratis para nuevas cuentas
  - Modelo GPT-3.5-turbo: ~$0.002 por cada 1000 tokens
  - Puedes configurar límites de gasto en tu cuenta

## 📁 Estructura del Proyecto

```
Mi_Portafolio/
├── api/
│   └── chat.js              # Función serverless para OpenAI
├── public/
│   ├── foto.jpg
│   ├── LOGO_FONDO2.png
│   ├── CV25_CARDONA.pdf
│   └── ...                  # Imágenes y recursos
├── index.html
├── main.html                # Página principal
├── main.css                 # Estilos
├── main.js                  # JavaScript del chat y navegación
├── vercel.json              # Configuración de Vercel
├── package.json             # Dependencias
├── .env.example             # Plantilla de variables de entorno
├── .gitignore
└── README.md
```

## 🤖 API del Chat

### Endpoint
```
POST /api/chat
```

### Request Body
```json
{
  "message": "¿Qué proyectos has realizado?",
  "conversationHistory": [
    { "role": "user", "content": "Hola" },
    { "role": "assistant", "content": "¡Hola! ¿Cómo puedo ayudarte?" }
  ]
}
```

### Response
```json
{
  "success": true,
  "reply": "He trabajado en varios proyectos...",
   "timestamp": "2025-01-21T12:00:00.000Z"
}
```

## 🎨 Personalización

### Cambiar el modelo de IA
En [api/chat.js](api/chat.js#L60):
```javascript
model: 'gpt-3.5-turbo', // Cambia a 'gpt-4' si tienes acceso
```

### Ajustar el comportamiento del bot
Edita el `system` prompt en [api/chat.js](api/chat.js#L34-L51)

### Modificar los colores
Edita las variables CSS en [main.css](main.css)

## 📧 Contacto

- **Email:** kikecar97@gmail.com
- **WhatsApp:** +504 3348-1474
- **LinkedIn:** [linkedin.com/in/cardona97](https://www.linkedin.com/in/cardona97)
- **GitHub:** [github.com/CarLuis07](https://github.com/CarLuis07)

## 📄 Licencia

MIT License - Siéntete libre de usar este código para tu propio portafolio.

---

Hecho con ❤️ por Luis Cardona
