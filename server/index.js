const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const os = require('os');
const aiPromptPath = path.join(__dirname, 'ai_prompt.json');
require('dotenv').config();

// If a service account JSON is provided via env (e.g. CI secret), write it to disk
// and set GOOGLE_APPLICATION_CREDENTIALS so Google SDKs use ADC.
try {
    const saRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const saB64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
    if (saRaw || saB64) {
        // Write credentials to a temp directory (avoid writing inside the project folder
        // to prevent nodemon from restarting when the file changes).
        const saPathEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(os.tmpdir(), 'google_service_account.json');
        try {
            let content = saRaw;
            if (!content && saB64) {
                // decode base64
                content = Buffer.from(saB64, 'base64').toString('utf8');
            }
            fs.writeFileSync(saPathEnv, content, 'utf8');
            process.env.GOOGLE_APPLICATION_CREDENTIALS = saPathEnv;
            console.log('Wrote service account JSON to', saPathEnv);
        } catch (werr) {
            console.warn('Could not write service account JSON to disk:', werr && werr.message);
        }
    }
} catch (e) {
    console.warn('Error processing GOOGLE_SERVICE_ACCOUNT_JSON:', e && e.message);
}
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = 'super-secret-key-change-this';

const AI_ENABLED = !!process.env.AI_API_KEY;

// Nodemailer Transporter (Configure with real credentials in .env)
const transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// CORS configuration for production
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);
        
        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        
        // Allow accesoit.com.ar domain and subdomains
        if (origin.includes('accesoit.com.ar')) {
            return callback(null, true);
        }
        
        // For production, log and allow (you can make this stricter later)
        console.log('CORS: Allowing origin:', origin);
        callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Security headers middleware
app.use((req, res, next) => {
    // Allow external resources and fix CSP issues
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // More permissive CSP for production (you can tighten this later)
    res.setHeader('Content-Security-Policy', 
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:; " +
        "connect-src 'self' https: http: wss: ws: localhost:* 127.0.0.1:*; " +
        "img-src 'self' data: https: http:; " +
        "font-src 'self' data: https: http: fonts.gstatic.com; " +
        "style-src 'self' 'unsafe-inline' https: http: fonts.googleapis.com;"
    );
    
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// NOTE: Static serving for the SPA is configured at the end of this file
// (after all /api routes) so we serve files from `server/public` and
// provide a catch-all that ignores `/api` routes.


// Middleware to authenticate token (simple version)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Middleware to authenticate token with disabled user check
const authenticateTokenWithDisabledCheck = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, async (err, payload) => {
        if (err) return res.sendStatus(403);

        try {
            // Verify user still exists and is not disabled
            const dbUser = await prisma.user.findUnique({ where: { id: payload.id } });
            if (!dbUser) return res.sendStatus(401);
            if (dbUser.disabled) {
                console.warn('Authentication attempt for disabled user', dbUser.email);
                return res.status(403).json({ error: 'Usuario deshabilitado' });
            }

            // Attach minimal user data to the request
            req.user = { id: dbUser.id, email: dbUser.email, role: dbUser.role };
            next();
        } catch (e) {
            console.error('Error checking user status in authenticateTokenWithDisabledCheck:', e);
            return res.sendStatus(500);
        }
    });
};

// Routes
const n8nRoutes = require('./routes/n8n');
app.use('/api/n8n', authenticateTokenWithDisabledCheck, n8nRoutes);

const paymentsRoutes = require('./routes/payments');
app.use('/api/webhooks/payments', paymentsRoutes);

// Login Route
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    console.log(`[LOGIN] Intento de login: ${email}`);

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.log(`[LOGIN] Usuario no encontrado: ${email}`);
            return res.status(400).json({ error: 'User not found' });
        }

        // Block disabled users
        if (user.disabled) {
            console.log(`[LOGIN] Usuario deshabilitado: ${email}`);
            return res.status(403).json({ error: 'Usuario deshabilitado' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log(`[LOGIN] Password inválida para: ${email}`);
            return res.status(400).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        console.log(`[LOGIN] Login exitoso: ${email} (${user.role})`);
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company } });
    } catch (error) {
        console.error('[LOGIN] Error durante login:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Google OAuth Login Route
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ error: 'No credential provided' });
    }

    try {
        // Decode Google JWT token (basic decoding, in production use google-auth-library)
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            Buffer.from(base64, 'base64')
                .toString()
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        const googleUser = JSON.parse(jsonPayload);

        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { email: googleUser.email }
        });

        // If not, create new user
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: googleUser.email,
                    name: googleUser.name || googleUser.email.split('@')[0],
                    password: '', // No password for Google users
                    company: null
                }
            });
        }

        // Block disabled users
        if (user.disabled) {
            console.warn('Google login attempt for disabled user', user.email);
            return res.status(403).json({ error: 'Usuario deshabilitado' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                company: user.company,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Dashboard Data Route
app.get('/api/dashboard', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const services = await prisma.serviceStatus.findMany({
            where: { userId: req.user.id },
        });
        res.json({ services });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Runtime configuration endpoint for the frontend (returns Google client id, etc.)
app.get('/api/config', async (req, res) => {
    try {
        const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || null;
        // Exponer el provider actual para que el frontend sepa qué prompt cargar
        let provider = 'openai';
        try {
            const cfg = await prisma.config.findUnique({ where: { key: 'ai_provider_settings' } });
            if (cfg?.value) provider = JSON.parse(cfg.value).provider || provider;
        } catch {}
        return res.json({ googleClientId, provider });
    } catch (e) {
        return res.json({ googleClientId: null, provider: 'openai' });
    }
});

// Contact Email Route
app.post('/api/contact', async (req, res) => {
    const { name, company, email, message } = req.body;

    const mailOptions = {
        from: email,
        to: 'contacto@accesoit.com.ar',
        subject: `Nuevo Mensaje de ${name} (${company || 'Sin empresa'})`,
        text: `
      Nombre: ${name}
      Empresa: ${company || 'No especificada'}
      Email: ${email}
      
      Mensaje:
      ${message}
    `
    };

    try {
        // Uncomment to actually send email when credentials are set
        await transporter.sendMail(mailOptions);

        // For now, log to console to simulate
        console.log('--- EMAIL SIMULATION ---');
        console.log(mailOptions);
        console.log('------------------------');

        res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// AI Chat Route with Function Calling
// Helper to perform reschedule logic (module-level so both endpoint and AI handler can use it)
async function doReschedule({ appointmentId, sessionId, email, oldDate, oldTime, newDate, newTime }) {
    let appointment;
    if (appointmentId) {
        appointment = await prisma.appointment.findUnique({ where: { id: parseInt(appointmentId) } });
    } else if (sessionId) {
        appointment = await prisma.appointment.findFirst({ where: { sessionId, status: 'pending' }, orderBy: { createdAt: 'desc' } });
    } else if (email && oldDate && oldTime) {
        appointment = await prisma.appointment.findFirst({ where: { email, date: oldDate, time: oldTime, status: 'pending' } });
    } else if (email) {
        appointment = await prisma.appointment.findFirst({ where: { email, status: 'pending' }, orderBy: { createdAt: 'desc' } });
    }

    if (!appointment) {
        return { ok: false, message: 'No encuentro la cita a modificar. Provee appointmentId, sessionId o más datos.' };
    }

    const N8N_WEBHOOK_CANCEL_URL = process.env.N8N_WEBHOOK_CANCEL_URL;
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

    // 1) Cancel old event in n8n if exists
    if (appointment.googleEventId && N8N_WEBHOOK_CANCEL_URL) {
        try {
            console.log('🗑️  [RESCHEDULE] Solicitando eliminación de evento:', {
                appointmentId: appointment.id,
                googleEventId: appointment.googleEventId,
                nombre: appointment.name,
                email: appointment.email,
                fecha: appointment.date,
                hora: appointment.time
            });
            await fetch(N8N_WEBHOOK_CANCEL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: appointment.id,
                    googleEventId: appointment.googleEventId,
                    nombre: appointment.name,
                    email: appointment.email,
                    fecha: appointment.date,
                    hora: appointment.time
                })
            });
        } catch (err) {
            console.error('Error notifying n8n cancel during reschedule:', err);
        }
    }

    // 2) Create new event via n8n
    let newEventId = null;
    if (N8N_WEBHOOK_URL) {
        try {
            console.log('doReschedule: creating new event via n8n', N8N_WEBHOOK_URL);
            const createRes = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: appointment.name,
                    email: appointment.email.includes('@temp.accesoit.com') ? '' : appointment.email,
                    phone: appointment.phone,
                    fecha: newDate,
                    hora: newTime,
                    service: appointment.service,
                    message: appointment.message,
                    appointmentId: appointment.id
                })
            });

            const text = await createRes.text();
            try {
                const json = JSON.parse(text);
                if (json.eventId) newEventId = json.eventId;
            } catch (e) {
                // not json
            }
        } catch (err) {
            console.error('Error creating new event in n8n during reschedule:', err);
        }
    }

    // 3) Update appointment in DB
    const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
            date: newDate,
            time: newTime,
            ...(newEventId ? { googleEventId: newEventId } : {})
        }
    });

    return { ok: true, appointment: updated };
}


app.post('/api/chat', async (req, res) => {
    const { message, history, sessionId } = req.body;

    // Quick-response for short greetings to avoid long sales-first replies.
    try {
        const text = (message || '').toString().trim();
        const isGreeting = /^((hola|buenas|buenos\s?d[ií]as|buenas\s?tardes|buenas\s?noches|hey|hi|hello)([.!?]*)?)$/i.test(text);
        if (isGreeting) {
            // Use a short, friendly greeting in voseo
            return res.json({ reply: '¡Hola! ¿En qué puedo ayudarte hoy?' });
        }
    } catch (gErr) {
        // If greeting detection fails, continue to normal flow
        console.warn('Greeting detection error:', gErr && gErr.message);
    }

    if (!AI_ENABLED) {
        console.error('AI API key not configured. Set AI_API_KEY in .env');
        return res.status(500).json({ error: 'AI_API_KEY not configured on server' });
    }

    try {
        // --- Dynamic AI Configuration ---
        let providerSettings = {
            provider: 'openai',
            model: process.env.AI_MODEL || 'gpt-4o-mini',
            apiKey: process.env.AI_API_KEY,
            baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1'
        };
        
        console.log('=== AI PROVIDER CONFIGURATION ===');
        console.log('Default settings loaded from env');

        try {
            const config = await prisma.config.findUnique({
                where: { key: 'ai_provider_settings' }
            });
            if (config && config.value) {
                const dbSettings = JSON.parse(config.value);
                console.log('Database settings found:', JSON.stringify({
                    provider: dbSettings.provider,
                    model: dbSettings.model,
                    hasApiKey: !!dbSettings.apiKey,
                    baseUrl: dbSettings.baseUrl
                }, null, 2));
                
                // Ensure all required fields are present
                if (dbSettings.provider && dbSettings.model && dbSettings.apiKey) {
                    providerSettings = dbSettings;
                    console.log('Using database settings');
                } else {
                    console.log('Database settings incomplete, using env fallback');
                }
            } else {
                console.log('No database settings found, using env fallback');
            }
        } catch (e) {
            console.warn('Could not load AI provider settings from DB, using fallback .env config.', e.message);
        }

        // Initialize AI client based on provider
        let aiClient;
        console.log('Final provider settings:', JSON.stringify({
            provider: providerSettings.provider,
            model: providerSettings.model,
            hasApiKey: !!providerSettings.apiKey,
            baseUrl: providerSettings.baseUrl
        }, null, 2));
        
        if (providerSettings.provider === 'gemini') {
            console.log('Initializing Gemini client with API key...');
            
            if (!providerSettings.apiKey) {
                throw new Error('Gemini API key is required. Get one from Google AI Studio.');
            }

            // Simple client for REST API calls
            aiClient = {
                apiKey: providerSettings.apiKey,
                baseUrl: providerSettings.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
                model: providerSettings.model || 'gemini-2.0-flash-lite'
            };
            console.log('Gemini client initialized with model:', aiClient.model);
        } else {
            console.log('Initializing OpenAI-compatible client...');
            // OpenAI-compatible providers (openai, groq, custom)
            aiClient = new OpenAI({
                apiKey: providerSettings.apiKey,
                baseURL: providerSettings.baseUrl || (providerSettings.provider === 'openai' ? 'https://api.openai.com/v1' : null),
            });
            console.log('OpenAI-compatible client initialized');
        }
        // --- End Dynamic AI Configuration ---
        console.log('================================');

        console.log('AI: sending request with provider', providerSettings.provider, 'and model', providerSettings.model);

        // Load system prompt from database (editable via admin endpoint)
        let systemPrompt = null;
        try {
            const config = await prisma.config.findUnique({
                where: { key: 'ai_prompt' }
            });
            systemPrompt = config?.value || null;
        } catch (e) {
            console.warn('Could not load AI prompt from database, falling back to built-in prompt', e && e.message);
        }

        const systemContent = systemPrompt || `Eres el asistente comercial de AccesoIT, expertos en automatización e IA.

TONO Y PERSONALIDAD (PROFESIONAL CERCANO):
- Usa "vos" (tratamiento estándar en Argentina) pero mantén un vocabulario profesional.
- Sé cordial, directo y ejecutivo.
- Evita el slang o informalidad excesiva ("tranqui", "re", "buenísimo").
- Evita también la formalidad robótica ("estimado", "su persona").
- Actúa como un consultor experto que valora el tiempo del cliente.

OBJETIVO PRINCIPAL:
Tu ÚNICA meta es AGENDAR UNA LLAMADA (video o telefónica) con el cliente. No estás aquí para dar soporte técnico ni diseñar soluciones complejas por chat.

COMPORTAMIENTO DE VENTA:
1.  **Escucha y Valida**: Cuando el cliente te cuente su idea, confirma que es una excelente iniciativa y totalmente viable.
2.  **No Abrumes**: Cero tecnicismos (APIs, protocolos) a menos que te pregunten.
3.  **Cierra la Venta**: Después de validar, invita a una llamada para concretar.

MANEJO DE OBJECIONES:
- Si dicen "no tengo idea": "No te preocupes, nosotros nos encargamos de la tecnología. Lo importante es entender tu negocio. ¿Podemos hablar mañana?"
- Si preguntan precios: "Depende del alcance del proyecto, pero tenemos opciones a medida. Lo podemos revisar en una llamada de 10 minutos."

AGENDAMIENTO (PRIORIDAD MÁXIMA):
- PRECAUCIÓN: Al extraer datos de contacto como emails, revisa la ortografía dos veces para evitar errores. Por ejemplo, si un usuario escribe "castelelite18@gmail.com", asegúrate de no escribir "castelelelite18@gmail.com".
- Agenda INMEDIATAMENTE si tienes fecha y hora.
- Si falta el nombre o email, pídelo amablemente.
- Asume "Consulta de Automatización" como servicio.
- Usa la fecha de mañana si dicen "mañana".`;

        // Define functions for function calling
        const functions = [
            {
                name: 'schedule_appointment',
                description: 'Agenda una cita INMEDIATAMENTE cuando tengas fecha, hora y al menos un dato de contacto (email o teléfono). No esperes a tener todos los datos.',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Nombre del cliente (usa "Cliente" si no lo proporciona)' },
                        email: { type: 'string', description: 'Email del cliente (usa un placeholder si solo dio teléfono)' },
                        phone: { type: 'string', description: 'Teléfono del cliente' },
                        date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
                        time: { type: 'string', description: 'Hora en formato HH:MM (24h)' },
                        service: { type: 'string', description: 'Servicio de interés (usa "Consulta general" si no especifica)' },
                        message: { type: 'string', description: 'Mensaje o notas adicionales' }
                    },
                    required: ['date', 'time']
                }
            },
            {
                name: 'reschedule_appointment',
                description: 'Reprograma la última cita agendada en esta conversación. El sistema automáticamente encuentra la cita por el sessionId. Solo necesitas proporcionar la nueva fecha y hora.',
                parameters: {
                    type: 'object',
                    properties: {
                        newDate: { type: 'string', description: 'Nueva fecha en formato YYYY-MM-DD' },
                        newTime: { type: 'string', description: 'Nueva hora en formato HH:MM (24h)' },
                        reason: { type: 'string', description: 'Razón del cambio (opcional)' }
                    },
                    required: ['newDate', 'newTime']
                }
            },
            {
                name: 'update_client_data',
                description: 'Actualiza o corrige los datos de contacto (email, teléfono, nombre) de la última cita agendada. Úsalo cuando el usuario diga que se equivocó en algún dato.',
                parameters: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', description: 'Nuevo email corregido' },
                        phone: { type: 'string', description: 'Nuevo teléfono corregido' },
                        name: { type: 'string', description: 'Nuevo nombre corregido' }
                    }
                }
            }
        ];

        let completion;
        let responseMessage;

        if (providerSettings.provider === 'gemini') {
            // Handle Gemini API with proper function calling
            const geminiTools = [{
                function_declarations: functions.map(func => ({
                    name: func.name,
                    description: func.description,
                    parameters: func.parameters
                }))
            }];

            // Extra instructions ONLY for Gemini so it actually uses tools
            const geminiSystemContent = `${systemContent}

INSTRUCCIONES PARA HERRAMIENTAS (MUY IMPORTANTE):
- Tenés disponibles estas herramientas: schedule_appointment, reschedule_appointment, update_client_data.
- Siempre que el usuario quiera AGENDAR, REPROGRAMAR o CORREGIR datos de una cita, NO respondas solo en texto.
- En esos casos DEBES llamar explícitamente a la herramienta correspondiente usando functionCall en lugar de solo contestar en lenguaje natural.
- No digas que agendaste o cambiaste nada si no llamaste a una herramienta.`;

            // Build conversation history for Gemini
            const geminiContents = [
                {
                    role: 'user',
                    parts: [{ text: geminiSystemContent }]
                }
            ];

            // Add conversation history
            if (history && history.length > 0) {
                history.forEach(msg => {
                    geminiContents.push({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.content }]
                    });
                });
            }

            // Add current user message
            geminiContents.push({
                role: 'user',
                parts: [{ text: message }]
            });

            try {
                console.log('Sending to Gemini with tools:', geminiTools.length > 0 ? 'enabled' : 'disabled');
                
                // Call REST API with x-goog-api-key header (recommended by Google)
                const endpoint = `${aiClient.baseUrl}/models/${aiClient.model}:generateContent`;
                const payload = {
                    contents: geminiContents,
                    tools: geminiTools,
                    tool_config: {
                        function_calling_config: { mode: 'AUTO' }
                    }
                };

                const headers = {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': aiClient.apiKey
                };

                const resp = await fetch(endpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload)
                });

                if (!resp.ok) {
                    const errorText = await resp.text();
                    throw new Error(`Gemini REST error ${resp.status}: ${errorText}`);
                }

                const response = await resp.json();
                console.log('Gemini response candidates:', Array.isArray(response.candidates) ? response.candidates.length : 0);

                // Check if Gemini made a function call
                let functionCall = null;
                if (response.candidates && response.candidates[0]?.content?.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.functionCall) {
                            console.log('Gemini function call detected:', part.functionCall.name);
                            functionCall = {
                                name: part.functionCall.name,
                                arguments: JSON.stringify(part.functionCall.args)
                            };
                            break;
                        }
                    }
                }

                // Get text response
                let textResponse = '';
                try {
                    if (Array.isArray(response.candidates) && response.candidates[0]?.content?.parts) {
                        const textPart = response.candidates[0].content.parts.find(p => p.text);
                        textResponse = textPart?.text || '';
                    }
                } catch (e) {
                    console.log('No text response from Gemini (likely due to function call)');
                }

                // Convert Gemini response to OpenAI format for compatibility
                responseMessage = {
                    content: textResponse,
                    function_call: functionCall
                };

                console.log('Converted Gemini response - has function call:', !!functionCall);

            } catch (geminiError) {
                console.error('=== GEMINI SPECIFIC ERROR ===');
                console.error('Gemini Error Type:', geminiError.constructor.name);
                console.error('Gemini Error Message:', geminiError.message);
                console.error('Gemini Error Details:', geminiError);
                if (geminiError.response) {
                    console.error('Gemini API Response:', geminiError.response);
                }
                console.error('============================');
                throw geminiError;
            }
        } else {
            // Handle OpenAI-compatible APIs
            completion = await aiClient.chat.completions.create({
                model: providerSettings.model,
                messages: [
                    {
                        role: 'system',
                        content: systemContent,
                    },
                    ...(history || []),
                    { role: 'user', content: message }
                ],
                functions: functions,
                function_call: 'auto'
            });

            responseMessage = completion.choices[0].message;
        }

        console.log('AI: response received from', providerSettings.provider);
        // Log a summary to help debugging (avoid dumping secrets)
        try {
            if (providerSettings.provider !== 'gemini') {
                console.log('AI: choices length =', completion.choices ? completion.choices.length : 0);
            }
        } catch (logErr) {
            console.warn('AI: could not log completion summary', logErr);
        }

        // (doReschedule is defined at module level)

        // Check if AI wants to call a function
        if (responseMessage.function_call) {
            const functionName = responseMessage.function_call.name;
            const functionArgs = JSON.parse(responseMessage.function_call.arguments);

            if (functionName === 'schedule_appointment') {
                // 1. Verificar si ya existe una cita en ese horario (LOCAL)
                let isBusy = false;

                const existingAppointment = await prisma.appointment.findFirst({
                    where: {
                        date: functionArgs.date,
                        time: functionArgs.time,
                        status: {
                            in: ['pending', 'confirmed']
                        }
                    }
                });

                if (existingAppointment) {
                    isBusy = true;
                }

                // 1.5. Verificar disponibilidad en Google Calendar (EXTERNO)
                const N8N_WEBHOOK_CHECK_AVAILABILITY_URL = process.env.N8N_WEBHOOK_CHECK_AVAILABILITY_URL;
                if (!isBusy && N8N_WEBHOOK_CHECK_AVAILABILITY_URL) {
                    try {
                        // Calcular hora fin (asumimos 1 hora de duración)
                        const [hours, minutes] = functionArgs.time.split(':');
                        const endHour = parseInt(hours) + 1;
                        const endTime = `${endHour.toString().padStart(2, '0')}:${minutes}`;

                        console.log(`Verificando disponibilidad externa en ${N8N_WEBHOOK_CHECK_AVAILABILITY_URL} para ${functionArgs.date} ${functionArgs.time}-${endTime}`);

                        const checkRes = await fetch(N8N_WEBHOOK_CHECK_AVAILABILITY_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                date: functionArgs.date,
                                time: functionArgs.time,
                                endTime: endTime
                            })
                        });

                        if (checkRes.ok) {
                            const checkData = await checkRes.json();
                            if (checkData.busy) {
                                console.log('Google Calendar reporta horario ocupado');
                                isBusy = true;
                            }
                        }
                    } catch (err) {
                        console.error('Error verificando disponibilidad externa:', err);
                    }
                }

                // 2. Si el horario está ocupado, buscar alternativas
                if (isBusy) {
                    console.log(`Horario ocupado: ${functionArgs.date} a las ${functionArgs.time}. Buscando alternativas...`);

                    // Buscar todas las citas del mismo día
                    const appointmentsOnDate = await prisma.appointment.findMany({
                        where: {
                            date: functionArgs.date,
                            status: {
                                in: ['pending', 'confirmed']
                            }
                        },
                        select: {
                            time: true
                        }
                    });

                    // Horarios disponibles (de 9:00 a 18:00, cada hora)
                    const allSlots = [
                        '09:00', '10:00', '11:00', '12:00',
                        '13:00', '14:00', '15:00', '16:00',
                        '17:00', '18:00'
                    ];

                    const occupiedTimes = appointmentsOnDate.map(apt => apt.time);
                    const availableSlots = allSlots.filter(slot => !occupiedTimes.includes(slot));

                    // Construir mensaje con alternativas
                    let alternativesMessage;
                    if (availableSlots.length > 0) {
                        const suggestions = availableSlots.slice(0, 3).join(', ');
                        alternativesMessage = `Lo siento, el ${functionArgs.date} a las ${functionArgs.time} ya está ocupado. Tengo disponibilidad ese mismo día a las: ${suggestions}. ¿Te gustaría agendar en alguno de estos horarios?`;
                    } else {
                        alternativesMessage = `Lo siento, el ${functionArgs.date} a las ${functionArgs.time} ya está ocupado y no tengo más horarios disponibles ese día. ¿Prefieres otro día?`;
                    }

                    return res.json({
                        reply: alternativesMessage,
                        occupied: true,
                        availableSlots: availableSlots.slice(0, 3)
                    });
                }

                // 3. Si está libre, proceder a crear la cita
                // Corrección de fecha: si el modelo devuelve una fecha en el pasado o el usuario dijo "mañana",
                // ajustamos la fecha de forma segura para que el evento se cree visible y en el futuro.
                const userText = (message || '').toString().toLowerCase();
                let finalDate = functionArgs.date;
                try {
                    const now = new Date();
                    const inPast = (d) => d.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                    if (userText.includes('mañana')) {
                        const tomorrow = new Date(now);
                        tomorrow.setDate(now.getDate() + 1);
                        const y = tomorrow.getFullYear();
                        const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
                        const dd = String(tomorrow.getDate()).padStart(2, '0');
                        finalDate = `${y}-${m}-${dd}`;
                        console.log('Fecha ajustada por "mañana":', finalDate);
                    } else {
                        const provided = new Date(`${functionArgs.date}T00:00:00`);
                        if (inPast(provided)) {
                            // Si la fecha está en el pasado, moverla al día siguiente de hoy
                            const nextDay = new Date(now);
                            nextDay.setDate(now.getDate() + 1);
                            const y = nextDay.getFullYear();
                            const m = String(nextDay.getMonth() + 1).padStart(2, '0');
                            const dd = String(nextDay.getDate()).padStart(2, '0');
                            finalDate = `${y}-${m}-${dd}`;
                            console.log('Fecha ajustada por estar en pasado:', functionArgs.date, '->', finalDate);
                        }
                    }
                } catch (dateErr) {
                    console.warn('No se pudo ajustar fecha, usando la original:', dateErr && dateErr.message);
                    finalDate = functionArgs.date;
                }

                // Valores por defecto inteligentes
                const appointmentName = functionArgs.name || 'Cliente';
                const appointmentEmail = functionArgs.email || (functionArgs.phone ? `${functionArgs.phone}@temp.accesoit.com` : 'sin-email@temp.accesoit.com');
                const appointmentService = functionArgs.service || 'Consulta general';

                const appointment = await prisma.appointment.create({
                    data: {
                        name: appointmentName,
                        email: appointmentEmail,
                        phone: functionArgs.phone || null,
                        sessionId: sessionId || null,
                        date: finalDate,
                        time: functionArgs.time,
                        service: appointmentService,
                        message: functionArgs.message || null,
                        status: 'pending'
                    }
                });

                console.log('Appointment created successfully:', appointment.id);

                // 4. Enviar al webhook de N8N
                const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
                if (N8N_WEBHOOK_URL) {
                    try {
                        console.log('Posting appointment to N8N webhook:', N8N_WEBHOOK_URL);
                        const fetchRes = await fetch(N8N_WEBHOOK_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                nombre: appointment.name,
                                email: appointment.email.includes('@temp.accesoit.com') ? '' : appointment.email,
                                phone: appointment.phone,
                                fecha: appointment.date,
                                hora: appointment.time,
                                service: appointment.service,
                                message: appointment.message,
                                appointmentId: appointment.id
                            })
                        });

                        const webhookText = await fetchRes.text();
                        console.log('N8N webhook responded with status', fetchRes.status, 'body:', webhookText);

                        // Si n8n devuelve el eventId de Google Calendar, actualizarlo en la BD
                        try {
                            const webhookResponse = JSON.parse(webhookText);

                            // n8n puede devolver: { eventId: "..." } o { id: "..." } o un array [{ id: "..." }]
                            let gEventId = null;

                            if (Array.isArray(webhookResponse) && webhookResponse.length > 0) {
                                // Si es un array, tomar el id del primer elemento
                                gEventId = webhookResponse[0].id;
                            } else if (webhookResponse.eventId) {
                                gEventId = webhookResponse.eventId;
                            } else if (webhookResponse.id) {
                                gEventId = webhookResponse.id;
                              }

                            if (gEventId) {
                                await prisma.appointment.update({
                                    where: { id: appointment.id },
                                    data: { googleEventId: gEventId }
                                });
                                console.log('Google Event ID guardado:', gEventId);
                            } else {
                                console.warn('No se pudo extraer eventId de la respuesta de n8n:', webhookText.substring(0, 200));
                            }
                        } catch (parseErr) {
                            console.error('Error parseando respuesta de n8n:', parseErr);
                        }
                    } catch (webErr) {
                        console.error('Error posting to N8N webhook:', webErr);
                    }
                } else {
                    console.log('N8N_WEBHOOK_URL not set — skipping webhook POST');
                }

                // Construir mensaje de confirmación personalizado
                let confirmationMessage = `¡Perfecto${appointmentName !== 'Cliente' ? ` ${appointmentName}` : ''}! Agendé tu cita para el ${finalDate} a las ${functionArgs.time}.`;

                if (functionArgs.phone) {
                    confirmationMessage += ` Te contactaremos al ${functionArgs.phone}`;
                    if (functionArgs.email && !functionArgs.email.includes('@temp.accesoit.com')) {
                        confirmationMessage += ` y te enviaremos la confirmación a ${functionArgs.email}`;
                    }
                    confirmationMessage += '.';
                } else if (functionArgs.email && !functionArgs.email.includes('@temp.accesoit.com')) {
                    confirmationMessage += ` Te enviaremos la confirmación a ${functionArgs.email}.`;
                } else {
                    confirmationMessage += ` Te contactaremos pronto.`;
                }

                confirmationMessage += ' ¿Hay algo más en lo que pueda ayudarte?';

                res.json({
                    reply: confirmationMessage,
                    appointment: appointment
                });
            }
            else if (functionName === 'reschedule_appointment') {
                // Expecting newDate and newTime at least
                const { newDate, newTime, reason } = functionArgs;

                if (!newDate || !newTime) {
                    return res.json({ reply: 'Necesito la nueva fecha y hora para reprogramar la cita. ¿Cuál es la nueva fecha y hora?' });
                }

                // Usar el sessionId del request para encontrar la cita más reciente de esta conversación
                const result = await doReschedule({
                    sessionId: sessionId, // sessionId del request, no de functionArgs
                    newDate,
                    newTime
                });

                if (!result.ok) {
                    return res.json({ reply: result.message || 'No pude encontrar la cita a reprogramar.' });
                }

                // Construir mensaje de confirmación personalizado
                const apt = result.appointment;
                let rescheduleMessage = `¡Perfecto! Reprogramé tu cita para el ${newDate} a las ${newTime}.`;

                if (apt.phone) {
                    rescheduleMessage += ` Te contactaremos al ${apt.phone}.`;
                } else if (apt.email && !apt.email.includes('@temp.accesoit.com')) {
                    rescheduleMessage += ` Te enviaremos la confirmación a ${apt.email}.`;
                }

                rescheduleMessage += ' ¿Algo más en lo que pueda ayudarte?';

                return res.json({ reply: rescheduleMessage, appointment: result.appointment });
            }
            else if (functionName === 'update_client_data') {
                const { email, phone, name } = functionArgs;

                // 1. Buscar la cita
                const appointment = await prisma.appointment.findFirst({
                    where: { sessionId, status: 'pending' },
                    orderBy: { createdAt: 'desc' }
                });

                if (!appointment) {
                    return res.json({ reply: 'No encontré ninguna cita reciente para corregir. ¿Querés agendar una nueva?' });
                }

                // 2. Actualizar en DB primero
                await prisma.appointment.update({
                    where: { id: appointment.id },
                    data: {
                        ...(email && { email }),
                        ...(phone && { phone }),
                        ...(name && { name })
                    }
                });

                // 3. Forzar actualización en Google Calendar (usando doReschedule con la misma fecha/hora)
                // Esto borrará el evento viejo (con email incorrecto) y creará uno nuevo (con email correcto)
                const result = await doReschedule({
                    appointmentId: appointment.id,
                    newDate: appointment.date,
                    newTime: appointment.time
                });

                let replyMsg = '¡Listo! Ya actualicé tus datos.';
                if (email) replyMsg += ` Te reenvié la confirmación a ${email}.`;

                return res.json({ reply: replyMsg, appointment: result.appointment });
            }
        } else {
            res.json({ reply: responseMessage.content });
        }
    } catch (error) {
        console.error('=== CHAT API ERROR ===');
        console.error('Error Type:', error.constructor.name);
        console.error('Error Message:', error.message);
        if (typeof providerSettings !== 'undefined') {
            console.error('Provider Settings:', JSON.stringify({
                provider: providerSettings?.provider || 'undefined',
                model: providerSettings?.model || 'undefined',
                hasApiKey: !!providerSettings?.apiKey,
                baseUrl: providerSettings?.baseUrl || 'undefined'
            }, null, 2));
        } else {
            console.error('Provider Settings: undefined (not initialized)');
        }
        console.error('Stack Trace:', error.stack);
        console.error('=====================');
        
        // More specific error messages based on error type
        let errorMessage = 'Error interno del servidor';
        
        if (error.message?.includes('API key')) {
            errorMessage = 'Error: API Key no válida o no configurada';
        } else if (error.message?.includes('model')) {
            errorMessage = 'Error: Modelo no válido o no disponible';
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
            errorMessage = 'Error: No se pudo conectar con el proveedor de IA';
        } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
            errorMessage = 'Error: Límite de cuota excedido en el proveedor de IA';
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


// Reschedule appointment endpoint (can be called by admin UI or AI flow)
app.post('/api/reschedule', async (req, res) => {
    try {
        const result = await doReschedule(req.body || {});
        if (!result.ok) return res.status(404).json(result);
        return res.json({ ok: true, appointment: result.appointment, message: 'Cita reprogramada correctamente' });
    } catch (error) {
        console.error('Error in reschedule endpoint:', error);
        return res.status(500).json({ ok: false, error: 'Error reprogramando cita' });
    }
});

// Get all appointments (for admin)
app.get('/api/appointments', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const appointments = await prisma.appointment.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

// Admin endpoints to get/update AI system prompt (using database)
app.get('/api/admin/ai-prompt', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        let config = await prisma.config.findUnique({
            where: { key: 'ai_prompt' }
        });
        
        // If no config exists, create default one
        if (!config) {
            const defaultPrompt = `Eres el asistente comercial de AccesoIT, expertos en automatización e IA.

TONO Y PERSONALIDAD (PROFESIONAL CERCANO):
- Usa "vos" (tratamiento estándar en Argentina) pero mantén un vocabulario profesional.
- Sé cordial, directo y ejecutivo.
- Evita el slang o informalidad excesiva ("tranqui", "re", "buenísimo").
- Evita también la formalidad robótica ("estimado", "su persona").
- Actúa como un consultor experto que valora el tiempo del cliente.

OBJETIVO PRINCIPAL:
Tu ÚNICA meta es AGENDAR UNA LLAMADA (video o telefónica) con el cliente. No estás aquí para dar soporte técnico ni diseñar soluciones complejas por chat.

COMPORTAMIENTO DE VENTA:
1.  **Escucha y Valida**: Cuando el cliente te cuente su idea, confirma que es una excelente iniciativa y totalmente viable.
2.  **No Abrumes**: Cero tecnicismos (APIs, protocolos) a menos que te pregunten.
3.  **Cierra la Venta**: Después de validar, invita a una llamada para concretar.

MANEJO DE OBJECIONES:
- Si dicen "no tengo idea": "No te preocupes, nosotros nos encargamos de la tecnología. Lo importante es entender tu negocio. ¿Podemos hablar mañana?"
- Si preguntan precios: "Depende del alcance del proyecto, pero tenemos opciones a medida. Lo podemos revisar en una llamada de 10 minutos."

AGENDAMIENTO (PRIORIDAD MÁXIMA):
- PRECAUCIÓN: Al extraer datos de contacto como emails, revisa la ortografía dos veces para evitar errores. Por ejemplo, si un usuario escribe "castelelite18@gmail.com", asegúrate de no escribir "castelelelite18@gmail.com".
- Agenda INMEDIATAMENTE si tienes fecha y hora.
- Si falta el nombre o email, pídelo amablemente.
- Asume "Consulta de Automatización" como servicio.
- Usa la fecha de mañana si dicen "mañana".`;
            
            config = await prisma.config.create({
                data: {
                    key: 'ai_prompt',
                    value: defaultPrompt
                }
            });
        }
        
        return res.json({ system: config.value });
    } catch (err) {
        console.error('Error reading AI prompt from database:', err && err.message);
        return res.status(500).json({ error: 'Could not read AI prompt' });
    }
});

app.post('/api/admin/ai-prompt', authenticateTokenWithDisabledCheck, async (req, res) => {
    const { system } = req.body || {};
    if (typeof system !== 'string') return res.status(400).json({ error: 'Invalid payload' });

    try {
        await prisma.config.upsert({
            where: { key: 'ai_prompt' },
            update: { value: system },
            create: {
                key: 'ai_prompt',
                value: system
            }
        });
        return res.json({ ok: true });
    } catch (err) {
        console.error('Error saving AI prompt to database:', err && err.message);
        return res.status(500).json({ error: 'Could not save AI prompt' });
    }
});

// Admin endpoints to get/update AI Provider Settings
app.get('/api/admin/ai-provider', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const config = await prisma.config.findUnique({
            where: { key: 'ai_provider_settings' }
        });

        if (config && config.value) {
            const settings = JSON.parse(config.value);
            // Never send the full API key to the client.
            // Send only the last 4 chars for display purposes.
            if (settings.apiKey) {
                settings.apiKey = `...${settings.apiKey.slice(-4)}`;
            }

            return res.json(settings);
        }

        // Return default if not set, using environment variables as a fallback
        return res.json({
            provider: 'openai',
            model: process.env.AI_MODEL || 'gpt-4o-mini',
            apiKey: 'Not Set',
            baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1'
        });
    } catch (err) {
        console.error('Error reading AI provider settings:', err);
        return res.status(500).json({ error: 'Could not read AI provider settings' });
    }
});

app.post('/api/admin/ai-provider', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const existingConfig = await prisma.config.findUnique({ where: { key: 'ai_provider_settings' } });
        let currentSettings = {};
        if (existingConfig && existingConfig.value) {
            currentSettings = JSON.parse(existingConfig.value);
        }

        const { provider, model, apiKey, baseUrl } = req.body;
        if (!provider || !model) {
            return res.status(400).json({ error: 'Provider and model are required' });
        }

        const newApiKey = (apiKey && !apiKey.startsWith('...')) ? apiKey : currentSettings.apiKey;
        const newSettings = {
            provider,
            model,
            apiKey: newApiKey,
            baseUrl: baseUrl || ''
        };

        await prisma.config.upsert({
            where: { key: 'ai_provider_settings' },
            update: { value: JSON.stringify(newSettings) },
            create: {
                key: 'ai_provider_settings',
                value: JSON.stringify(newSettings)
            }
        });
        return res.json({ ok: true });
    } catch (err) {
        console.error('Error saving AI provider settings:', err);
        return res.status(500).json({ error: 'Could not save AI provider settings' });
    }
});

// List available AI models for the current provider (Gemini via OAuth)
app.get('/api/admin/ai-provider/models', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        // Load provider settings from DB
        const config = await prisma.config.findUnique({ where: { key: 'ai_provider_settings' } });
        const settings = config?.value ? JSON.parse(config.value) : null;
        if (!settings) return res.status(400).json({ error: 'AI provider not configured' });

        if (settings.provider !== 'gemini') {
            return res.json({ provider: settings.provider, models: [] });
        }

        // List models via REST using API key with x-goog-api-key header
        if (!settings.apiKey) {
            return res.status(400).json({ error: 'Gemini API key is required' });
        }

        const baseUrl = settings.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
        const headers = {
            'Content-Type': 'application/json',
            'x-goog-api-key': settings.apiKey
        };
        const url = `${baseUrl}/models`;

        const listResp = await fetch(url, { method: 'GET', headers });
        if (!listResp.ok) {
            const errText = await listResp.text();
            return res.status(500).json({ error: `List models failed ${listResp.status}`, details: errText });
        }
        const json = await listResp.json();
        const models = (json.models || [])
            .map(m => (m.name || '').replace(/^models\//, ''))
            .filter(Boolean);
        return res.json({ provider: 'gemini', models });
    } catch (err) {
        console.error('Error listing AI models:', err);
        return res.status(500).json({ error: 'Could not list models' });
    }
});


// Admin endpoints for user management (admin only)
app.get('/api/admin/users', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (currentUser?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true, company: true, role: true, createdAt: true, disabled: true }
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.put('/api/admin/user/:id', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (currentUser?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { email, password, name, company, role } = req.body;
        const updateData = {};
        
        if (email) updateData.email = email;
        if (name !== undefined) updateData.name = name;
        if (company !== undefined) updateData.company = company;
        if (role) updateData.role = role;
        if (password) updateData.password = await bcrypt.hash(password, 10);

        // Allow updating disabled flag from admin update
        if (typeof req.body.disabled === 'boolean') updateData.disabled = req.body.disabled;

        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: updateData,
            select: { id: true, email: true, name: true, company: true, role: true, disabled: true }
        });

        res.json(user);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Admin endpoint: enable/disable a user
app.patch('/api/admin/user/:id/disable', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (currentUser?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { disabled } = req.body;
        if (typeof disabled !== 'boolean') return res.status(400).json({ error: 'Invalid payload' });

        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: { disabled },
            select: { id: true, email: true, name: true, role: true, disabled: true }
        });

        res.json({ ok: true, user });
    } catch (error) {
        console.error('Error toggling user disabled:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// Admin endpoint: delete a user (requires explicit confirmation to prevent accidents)
app.delete('/api/admin/user/:id', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (currentUser?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { confirm, hard } = req.body || {};

        // Require explicit confirmation string to allow deletion
        if (confirm !== 'ELIMINAR') {
            return res.status(400).json({ error: 'Deletion not confirmed. Send { confirm: "ELIMINAR" } in body.' });
        }

        const userId = parseInt(req.params.id);

        if (hard === true) {
            // Hard delete
            await prisma.user.delete({ where: { id: userId } });
            return res.json({ ok: true, deleted: true, message: 'Usuario eliminado permanentemente' });
        } else {
            // Soft delete: mark as disabled and anonymize email to prevent reuse
            const anonEmail = `deleted_${userId}_${Date.now()}@deleted.local`;
            const user = await prisma.user.update({
                where: { id: userId },
                data: { disabled: true, email: anonEmail, name: 'Usuario eliminado' },
                select: { id: true, email: true, name: true, disabled: true }
            });

            return res.json({ ok: true, deleted: false, user, message: 'Usuario deshabilitado y anonimizado' });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// User profile endpoints (any authenticated user)
app.get('/api/profile', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ 
            where: { id: req.user.id },
            select: { id: true, email: true, name: true, company: true, role: true }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

app.put('/api/profile', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const { email, password, name, company } = req.body;
        const updateData = {};
        
        if (email) updateData.email = email;
        if (name !== undefined) updateData.name = name;
        if (company !== undefined) updateData.company = company;
        if (password) updateData.password = await bcrypt.hash(password, 10);

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: { id: true, email: true, name: true, company: true, role: true }
        });

        res.json(user);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Ticket system endpoints
app.get('/api/tickets', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
        let tickets;
        
        if (currentUser?.role === 'admin') {
            // Admin sees all tickets
            tickets = await prisma.ticket.findMany({
                include: { user: { select: { name: true, email: true } } },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            // Users see only their tickets
            tickets = await prisma.ticket.findMany({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'desc' }
            });
        }
        
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

app.post('/api/tickets', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const { subject, message, priority } = req.body;
        
        const ticket = await prisma.ticket.create({
            data: {
                userId: req.user.id,
                subject,
                message,
                priority: priority || 'medium'
            }
        });
        
        res.json(ticket);
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});

app.put('/api/tickets/:id', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
        const { status, response } = req.body;
        
        let updateData = {};
        
        if (currentUser?.role === 'admin') {
            // Admin can update status and response
            if (status) updateData.status = status;
            if (response !== undefined) {
                updateData.response = response;
                if (response) updateData.respondedAt = new Date();
            }
        } else {
            // Users can only update their own tickets (limited fields)
            const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(req.params.id) } });
            if (ticket?.userId !== req.user.id) {
                return res.status(403).json({ error: 'Access denied' });
            }
            // Users might close their own tickets
            if (status === 'closed') updateData.status = status;
        }

        const ticket = await prisma.ticket.update({
            where: { id: parseInt(req.params.id) },
            data: updateData
        });

        res.json(ticket);
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ error: 'Failed to update ticket' });
    }
});

// Update appointment (for admin) - can update status or googleEventId
app.patch('/api/appointments/:id', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, googleEventId } = req.body;

        const appointment = await prisma.appointment.update({
            where: { id: parseInt(id) },
            data: {
                ...(status && { status }),
                ...(googleEventId && { googleEventId })
            }
        });

        res.json(appointment);
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ error: 'Failed to update appointment' });
    }
});

// Cancel/Delete appointment (for admin)
app.delete('/api/appointments/:id', authenticateTokenWithDisabledCheck, async (req, res) => {
    try {
        const { id } = req.params;
        // Soporta borrado físico con ?hard=true
        const hardDelete = req.query.hard === 'true';

        // Obtener la cita antes de realizar acción
        const appointment = await prisma.appointment.findUnique({
            where: { id: parseInt(id) }
        });

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const N8N_WEBHOOK_CANCEL_URL = process.env.N8N_WEBHOOK_CANCEL_URL;

        if (hardDelete) {
            // Si tiene googleEventId, notificar a n8n para borrar el evento antes de eliminar la fila
            console.log(`Intentando eliminar cita ${id}. HardDelete: ${hardDelete}. GoogleEventId: ${appointment.googleEventId}`);
            console.log(`Webhook URL configurada: ${N8N_WEBHOOK_CANCEL_URL ? 'SÍ' : 'NO'} (${N8N_WEBHOOK_CANCEL_URL})`);

            if (N8N_WEBHOOK_CANCEL_URL && appointment.googleEventId) {
                try {
                    console.log('🗑️  [HARD DELETE] Solicitando eliminación permanente:', {
                        appointmentId: appointment.id,
                        googleEventId: appointment.googleEventId,
                        nombre: appointment.name,
                        email: appointment.email,
                        fecha: appointment.date,
                        hora: appointment.time
                    });
                    const fetchRes = await fetch(N8N_WEBHOOK_CANCEL_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            appointmentId: appointment.id,
                            googleEventId: appointment.googleEventId,
                            nombre: appointment.name,
                            email: appointment.email,
                            fecha: appointment.date,
                            hora: appointment.time
                        })
                    });

                    const webhookText = await fetchRes.text();
                    try {
                        const response = JSON.parse(webhookText);
                        console.log('✅ [DELETE RESPONSE]', fetchRes.status, response);
                        if (response.summary || response.start) {
                            console.log('   → Evento eliminado:', response.summary, 'en', response.start);
                        }
                    } catch (e) {
                        console.log('n8n hard-delete webhook respondió:', fetchRes.status, webhookText);
                    }
                } catch (webErr) {
                    console.error('Error al notificar eliminación a n8n:', webErr);
                }
            }

            // Borrado físico
            await prisma.appointment.delete({ where: { id: parseInt(id) } });

            return res.json({ success: true, deleted: true, message: 'Cita eliminada permanentemente' });
        } else {
            // Marcar como cancelada en lugar de eliminar
            const cancelledAppointment = await prisma.appointment.update({
                where: { id: parseInt(id) },
                data: { status: 'cancelled' }
            });

            // Notificar a n8n para que cancele el evento en Google Calendar
            if (N8N_WEBHOOK_CANCEL_URL && appointment.googleEventId) {
                try {
                    console.log('🗑️  [SOFT DELETE] Solicitando cancelación:', {
                        appointmentId: appointment.id,
                        googleEventId: appointment.googleEventId,
                        nombre: appointment.name,
                        email: appointment.email,
                        fecha: appointment.date,
                        hora: appointment.time
                    });
                    const fetchRes = await fetch(N8N_WEBHOOK_CANCEL_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            appointmentId: appointment.id,
                            googleEventId: appointment.googleEventId,
                            nombre: appointment.name,
                            email: appointment.email,
                            fecha: appointment.date,
                            hora: appointment.time
                        })
                    });

                    const webhookText = await fetchRes.text();
                    try {
                        const response = JSON.parse(webhookText);
                        console.log('✅ [CANCEL RESPONSE]', fetchRes.status, response);
                        if (response.summary || response.start) {
                            console.log('   → Evento cancelado:', response.summary, 'en', response.start);
                        }
                    } catch (e) {
                        console.log('n8n cancelación webhook respondió:', fetchRes.status, webhookText);
                    }
                } catch (webErr) {
                    console.error('Error al notificar cancelación a n8n:', webErr);
                }
            }

            return res.json({
                success: true,
                appointment: cancelledAppointment,
                message: 'Cita cancelada correctamente'
            });
        }
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({ error: 'Failed to cancel appointment' });
    }
});

// Serve static files from `server/public` and provide a SPA catch-all.
// This must be placed AFTER all API routes so it doesn't intercept them.
const publicPath = path.join(__dirname, 'public');

// 1) Servir archivos estáticos generados por Vite (copiados a `server/public`)
app.use(express.static(publicPath));

// 2) Catch-all para la SPA: si la ruta comienza con '/api' dejamos pasar,
//    en caso contrario devolvemos el `index.html` de la build.
app.use((req, res, next) => {
    if (req.path && req.path.startsWith('/api')) {
        return next();
    }

    res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Environment:', {
        AI_ENABLED,
        N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL ? 'configured' : 'NOT SET',
        PORT
    });
}).on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
