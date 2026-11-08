import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import ngrok from "@ngrok/ngrok";

// 1. Cargar variables de entorno inmediatamente al inicio
dotenv.config();

import {
  saveUploadedText,
  resetToInitial,
  nextChar,
  prevChar,
  getFullState,
} from './server/storage';
import {
  validateEsp32Token,
  getExpectedToken,
  getAllowedIp,
} from './server/authMiddleware';

const PORT = 3000;
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

async function forwardToApp() {
  const forwarder = await ngrok.forward({
    addr: "http://localhost:3000",
    authtoken: process.env.NGROK_AUTHTOKEN || "3FqIt432JYYox1es4eeYuqNdGrr_5yUUNdaxmpk1qMTCk3G9a",
    domain: "cupcake-coke-sappiness.ngrok-free.dev",
  });
  console.log(`🚀 ngrok túnel activo en: ${forwarder.url()}`);
}

// Configuración de almacenamiento Multer en /uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const original = file.originalname || 'documento.txt';
    const timestamp = Date.now();
    const cleanName = `${timestamp}-${original.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, cleanName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de texto plano (.txt)'));
    }
  },
});

async function startServer() {
  const app = express();

  // Middlewares para parsing de cuerpos JSON y URL-encoded
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging simple de peticiones a la API
  app.use('/api', (req, _res, next) => {
    const tokenHeader = req.headers['x-esp32-token'] ? 'Token Presente' : 'Sin Token';
    console.log(`[API ${req.method}] ${req.url} - ${tokenHeader}`);
    next();
  });

  // ==========================================
  // RUTAS DE LA API REST
  // ==========================================

  app.get('/api/config', (_req, res) => {
    res.json({
      success: true,
      defaultToken: getExpectedToken(),
      allowedIp: getAllowedIp() || 'Todas las IPs permitidas (Sin filtro)',
      serverTime: new Date().toISOString(),
    });
  });

  app.get('/api/braille/estado', validateEsp32Token, (_req, res) => {
    const fullState = getFullState();
    res.json(fullState);
  });

  app.post(
    '/api/upload',
    validateEsp32Token,
    upload.single('file'),
    (req, res) => {
      try {
        let content = '';
        let filename = 'documento.txt';

        if (req.file) {
          filename = req.file.originalname || req.file.filename;
          content = fs.readFileSync(req.file.path, 'utf-8');
        } else if (req.body && typeof req.body.text === 'string') {
          content = req.body.text;
          filename = req.body.filename || 'texto_cargado.txt';
        } else {
          return res.status(400).json({
            error: 'Petición inválida',
            message: 'Debe adjuntar un archivo .txt en el campo "file" o enviar JSON con "text".',
          });
        }

        const rawPosicionInicial = req.body?.posicion_inicial ?? req.body?.posicionInicial ?? 0;
        const posicionInicial = parseInt(rawPosicionInicial, 10) || 0;

        const result = saveUploadedText(filename, content, posicionInicial);

        console.log(`[Upload] Archivo '${filename}' guardado. Longitud: ${content.length}. Posición inicial fijada en ${posicionInicial}.`);

        return res.status(200).json({
          success: true,
          message: 'Archivo cargado y puntero inicializado correctamente',
          filename: filename,
          textLength: content.length,
          ...result,
        });
      } catch (error: any) {
        console.error('[Upload Error]:', error);
        return res.status(500).json({
          error: 'Error al procesar el archivo',
          message: error?.message || 'Error interno del servidor',
        });
      }
    }
  );

  app.get('/api/braille/inicio', validateEsp32Token, (_req, res) => {
    const result = resetToInitial();
    console.log(`[Braille Inicio] Posición: ${result.position}, Char: '${result.char}'`);
    res.json(result);
  });

  app.get('/api/braille/siguiente', validateEsp32Token, (_req, res) => {
    const result = nextChar();
    console.log(`[Braille Siguiente] Posición: ${result.position}, Char: '${result.char}'`);
    res.json(result);
  });

  app.get('/api/braille/anterior', validateEsp32Token, (_req, res) => {
    const result = prevChar();
    console.log(`[Braille Anterior] Posición: ${result.position}, Char: '${result.char}'`);
    res.json(result);
  });

  // Manejador global de errores
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error Middleware]:', err);
    res.status(400).json({
      error: 'Error en la petición',
      message: err?.message || 'Ocurrió un error inesperado',
    });
  });

  // ==========================================
  // CONFIGURACIÓN DE VITE & SERVIDO ESTÁTICO
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    // Captura peticiones del frontend en desarrollo para entregar index.html
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();

      try {
        const templatePath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);

        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`=========================================`);
    console.log(`🚀 Servidor Braille ESP32 corriendo en:`);
    console.log(`   http://0.0.0.0:${PORT}`);
    console.log(`   Token esperado: ${getExpectedToken()}`);
    console.log(`   Directorio uploads: ${UPLOADS_DIR}`);
    console.log(`=========================================`);

    try {
      await forwardToApp();
    } catch (err) {
      console.error('Error al iniciar el túnel de ngrok:', err);
    }
  });
}

startServer().catch((err) => {
  console.error('Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
