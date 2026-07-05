const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const os = require('os');

const LEGACY_ROOT = __dirname;
const DEFAULT_APPDATA_ROOT = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'Senialamientos'
);
const APP_DATA_DIR = process.env.APP_DATA_DIR
  ? path.resolve(process.env.APP_DATA_DIR)
  : DEFAULT_APPDATA_ROOT;
const STORAGE_ROOT = APP_DATA_DIR;
const FRONTEND_DIST = process.env.FRONTEND_DIST ? path.resolve(process.env.FRONTEND_DIST) : null;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyIfMissing(srcFile, destFile) {
  if (!fs.existsSync(srcFile) || fs.existsSync(destFile)) return;
  ensureDirExists(path.dirname(destFile));
  fs.copyFileSync(srcFile, destFile);
}

function copyDirIfMissing(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  ensureDirExists(destDir);

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcEntry = path.join(srcDir, entry.name);
    const destEntry = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDirIfMissing(srcEntry, destEntry);
      continue;
    }

    copyIfMissing(srcEntry, destEntry);
  }
}

function migrateLegacyDataToAppData() {
  try {
    ensureDirExists(STORAGE_ROOT);

    const legacyDataDir = path.join(LEGACY_ROOT, 'data');
    const targetDataDir = path.join(STORAGE_ROOT, 'data');
    copyDirIfMissing(legacyDataDir, targetDataDir);

    const legacyAuthDir = path.join(LEGACY_ROOT, '.wwebjs_auth');
    const targetAuthDir = path.join(STORAGE_ROOT, '.wwebjs_auth');
    copyDirIfMissing(legacyAuthDir, targetAuthDir);

    const legacyCacheDir = path.join(LEGACY_ROOT, '.wwebjs_cache');
    const targetCacheDir = path.join(STORAGE_ROOT, '.wwebjs_cache');
    copyDirIfMissing(legacyCacheDir, targetCacheDir);

    console.log('[Storage] Usando carpeta de datos:', STORAGE_ROOT);
  } catch (err) {
    console.error('[Storage] Error al migrar datos legacy:', err.message);
  }
}

migrateLegacyDataToAppData();

// Ruta a Chrome del sistema (fallback a puppeteer cache si no está el del sistema)
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.CHROME_PATH
].filter(Boolean);

const executablePath = CHROME_PATHS.find(p => fs.existsSync(p));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN, methods: ['GET', 'POST'] }
});

app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN }));
app.use(express.json());

// ── Almacenamiento de datos ─────────────────────────────────────────────────
const DATA_DIR = path.join(STORAGE_ROOT, 'data');
const DATA_FILE        = path.join(DATA_DIR, 'categories.json');
const SEMANAS_FILE     = path.join(DATA_DIR, 'semanas.json');
const SENALAMENTOS_FILE = path.join(DATA_DIR, 'senalamentos.json');

function makeReader(file) {
  return () => {
    if (!fs.existsSync(file)) return [];
    try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
    catch { return []; }
  };
}
function makeWriter(file) {
  return (data) => fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

const readCategories    = makeReader(DATA_FILE);
const writeCategories   = makeWriter(DATA_FILE);
const readSemanas       = makeReader(SEMANAS_FILE);
const writeSemanas      = makeWriter(SEMANAS_FILE);
const readSenalamentos  = makeReader(SENALAMENTOS_FILE);
const writeSenalamentos = makeWriter(SENALAMENTOS_FILE);

function initFile(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf-8');
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
[DATA_FILE, SEMANAS_FILE, SENALAMENTOS_FILE].forEach(initFile);

if (FRONTEND_DIST && fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
  app.use(express.static(FRONTEND_DIST));
}

// ── Cliente WhatsApp ─────────────────────────────────────────────────────────
let waStatus = 'initializing'; // initializing | qr | authenticated | ready | disconnected
let currentQR = null;
let waClient = null;

function initWhatsApp() {
  if (!executablePath) {
    waStatus = 'disconnected';
    io.emit('wa:status', waStatus);
    console.error('[WA] ERROR: No se encontró Chrome/Chromium. Instala Google Chrome o establece CHROME_PATH.');
    return;
  }
  console.log('[WA] Usando Chrome en:', executablePath);

  waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(STORAGE_ROOT, '.wwebjs_auth') }),
    puppeteer: {
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
  });

  waClient.on('qr', async (qr) => {
    waStatus = 'qr';
    currentQR = await qrcode.toDataURL(qr);
    io.emit('wa:status', waStatus);
    io.emit('wa:qr', currentQR);
    console.log('[WA] Código QR generado, escanéalo con WhatsApp');
  });

  waClient.on('authenticated', () => {
    waStatus = 'authenticated';
    currentQR = null;
    io.emit('wa:status', waStatus);
    console.log('[WA] Autenticado correctamente');
    
    // Verificar después de 3 segundos si el cliente está completamente listo
    setTimeout(() => {
      if (waClient && waClient.info) {
        console.log('[WA] Cliente info disponible, transicionando a ready');
        if (waStatus === 'authenticated') {
          waStatus = 'ready';
          io.emit('wa:status', waStatus);
          console.log('[WA] Listo para usar (detectado desde authenticated)');
        }
      }
    }, 3000);
  });

  waClient.on('ready', () => {
    waStatus = 'ready';
    currentQR = null;
    io.emit('wa:status', waStatus);
    console.log('[WA] Listo para usar');
  });

  waClient.on('auth_failure', (msg) => {
    waStatus = 'disconnected';
    io.emit('wa:status', waStatus);
    console.error('[WA] Error de autenticación:', msg);
  });

  waClient.on('disconnected', (reason) => {
    waStatus = 'disconnected';
    currentQR = null;
    io.emit('wa:status', waStatus);
    console.log('[WA] Desconectado:', reason);
    // Reintentar conexión tras 8 segundos
    setTimeout(initWhatsApp, 8000);
  });

  waClient.initialize();
  console.log('[WA] Inicializando...');
}

initWhatsApp();

// ── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[WS] Cliente conectado:', socket.id);
  // Enviar estado actual al nuevo cliente
  socket.emit('wa:status', waStatus);
  if (currentQR) socket.emit('wa:qr', currentQR);
  socket.on('disconnect', () => console.log('[WS] Cliente desconectado:', socket.id));
});

// ── Rutas API ────────────────────────────────────────────────────────────────

// Estado de WhatsApp
app.get('/api/whatsapp/status', (req, res) => {
  res.json({ status: waStatus });
});

// Grupos de WhatsApp
app.get('/api/whatsapp/groups', async (req, res) => {
  if (waStatus !== 'ready') {
    return res.status(503).json({ error: 'WhatsApp no está conectado' });
  }
  try {
    const chats = await waClient.getChats();
    const groups = chats
      .filter(c => c.isGroup)
      .map(c => ({ id: c.id._serialized, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Categorías - CRUD
app.get('/api/categories', (req, res) => {
  res.json(readCategories());
});

app.post('/api/categories', (req, res) => {
  const { categoria, division, genero, grupoWhatsapp } = req.body;
  if (!categoria || !categoria.trim()) {
    return res.status(400).json({ error: 'El campo Categoría es obligatorio' });
  }
  const categories = readCategories();
  const newItem = {
    id: Date.now().toString(),
    categoria: categoria.trim(),
    division: (division || '').trim(),
    genero: (genero || '').trim(),
    grupoWhatsapp: grupoWhatsapp || null
  };
  categories.push(newItem);
  writeCategories(categories);
  res.status(201).json(newItem);
});

app.put('/api/categories/:id', (req, res) => {
  const categories = readCategories();
  const idx = categories.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Categoría no encontrada' });
  const { categoria, division, genero, grupoWhatsapp } = req.body;
  categories[idx] = {
    ...categories[idx],
    categoria: (categoria || categories[idx].categoria).trim(),
    division: (division !== undefined ? division : categories[idx].division).trim(),
    genero: (genero !== undefined ? genero : categories[idx].genero).trim(),
    grupoWhatsapp: grupoWhatsapp !== undefined ? grupoWhatsapp : categories[idx].grupoWhatsapp
  };
  writeCategories(categories);
  res.json(categories[idx]);
});

app.delete('/api/categories/:id', (req, res) => {
  const categories = readCategories();
  const filtered = categories.filter(c => c.id !== req.params.id);
  if (filtered.length === categories.length) {
    return res.status(404).json({ error: 'Categoría no encontrada' });
  }
  writeCategories(filtered);
  res.json({ success: true });
});

// ── Semanas ──────────────────────────────────────────────────────────────────
app.get('/api/semanas', (req, res) => {
  res.json(readSemanas().sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio)));
});

app.post('/api/semanas', (req, res) => {
  const { fechaInicio, fechaFin, label } = req.body;
  if (!fechaInicio || !fechaFin) return res.status(400).json({ error: 'fechaInicio y fechaFin son obligatorios' });
  const semanas = readSemanas();
  const exists = semanas.find(s => s.fechaInicio === fechaInicio);
  if (exists) return res.status(409).json({ error: 'Ya existe una semana para esas fechas' });
  const newSemana = { id: Date.now().toString(), fechaInicio, fechaFin, label };
  semanas.push(newSemana);
  writeSemanas(semanas);
  res.status(201).json(newSemana);
});

app.delete('/api/semanas/:id', (req, res) => {
  const semanas = readSemanas();
  const filtered = semanas.filter(s => s.id !== req.params.id);
  if (filtered.length === semanas.length) return res.status(404).json({ error: 'Semana no encontrada' });
  writeSemanas(filtered);
  // Eliminar también los señalamientos de esa semana
  const senalamentos = readSenalamentos().filter(s => s.semanaId !== req.params.id);
  writeSenalamentos(senalamentos);
  res.json({ success: true });
});

// ── Señalamientos ────────────────────────────────────────────────────────────
app.get('/api/senalamentos', (req, res) => {
  let data = readSenalamentos();
  if (req.query.semanaId) data = data.filter(s => s.semanaId === req.query.semanaId);
  res.json(data.sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`)));
});

app.post('/api/senalamentos', (req, res) => {
  const { semanaId, fecha, hora, horaConcentracion, sede, categoria, rival } = req.body;
  if (!semanaId || !fecha || !hora) return res.status(400).json({ error: 'semanaId, fecha y hora son obligatorios' });
  const newItem = {
    id: Date.now().toString(),
    semanaId,
    fecha,
    hora,
    horaConcentracion: horaConcentracion || '',
    sede: (sede || '').trim(),
    rival: (rival || '').trim(),
    categoria: categoria || null,
    notificado: false,
    notificadoEn: null
  };
  const data = readSenalamentos();
  data.push(newItem);
  writeSenalamentos(data);
  res.status(201).json(newItem);
});

app.put('/api/senalamentos/:id', (req, res) => {
  const data = readSenalamentos();
  const idx = data.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Señalamiento no encontrado' });
  data[idx] = { ...data[idx], ...req.body, id: req.params.id };
  writeSenalamentos(data);
  res.json(data[idx]);
});

app.delete('/api/senalamentos/:id', (req, res) => {
  const data = readSenalamentos();
  const filtered = data.filter(s => s.id !== req.params.id);
  if (filtered.length === data.length) return res.status(404).json({ error: 'Señalamiento no encontrado' });
  writeSenalamentos(filtered);
  res.json({ success: true });
});

// ── Notificaciones a WhatsApp ────────────────────────────────────────────────
app.post('/api/whatsapp/notify', async (req, res) => {
  if (waStatus !== 'ready') {
    return res.status(503).json({ error: 'WhatsApp no está conectado' });
  }

  const { groupId, senalamentos } = req.body;
  if (!groupId) return res.status(400).json({ error: 'groupId es requerido' });
  if (!Array.isArray(senalamentos) || senalamentos.length === 0) {
    return res.status(400).json({ error: 'senalamentos debe ser un array no vacío' });
  }

  try {
    const messages = [];
    const notifiedIds = [];
    const notifiedAt = new Date().toISOString();
    
    for (const s of senalamentos) {
      const categoriaPartes = [
        s.categoria?.categoria,
        s.categoria?.division,
        s.categoria?.genero
      ].map(v => (v || '').trim()).filter(Boolean);
      const categoriaTexto = categoriaPartes.length ? categoriaPartes.join(' ') : 'Sin categoría';

      // Parsear la fecha YYYY-MM-DD
      const fecha = new Date(s.fecha + 'T12:00:00');
      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      
      const diaSemana = diasSemana[fecha.getDay()];
      const dia = fecha.getDate();
      const mes = meses[fecha.getMonth()];
      
      const fechaFormato = `${diaSemana} ${dia} de ${mes}`;
      
      const message = `⚽ *SEÑALAMIENTO OFICIAL* ⚽
🏃‍♂️ *Categoría:* ${categoriaTexto}
📅 *Fecha:* ${fechaFormato}
⏰ *Hora concentración:* ${s.horaConcentracion || 'No especificada'}
🏁 *Hora partido:* ${s.hora}
🏟️ *Sede:* ${s.sede || 'No especificada'}
${s.rival ? `🆚 *Rival:* ${s.rival}` : ''}`.trim();

      messages.push({
        id: s.id,
        message
      });
    }

    // Enviar cada mensaje al grupo
    for (const item of messages) {
      await waClient.sendMessage(groupId, item.message);
      if (item.id) notifiedIds.push(item.id);
    }

    if (notifiedIds.length > 0) {
      const data = readSenalamentos();
      const idsSet = new Set(notifiedIds);
      const updated = data.map(s => {
        if (!idsSet.has(s.id)) return s;
        return {
          ...s,
          notificado: true,
          notificadoEn: notifiedAt
        };
      });
      writeSenalamentos(updated);
    }

    res.json({ success: true, sentMessages: messages.length, notifiedIds, notifiedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (FRONTEND_DIST && fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    return res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// ── Inicio del servidor ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[Server] Ejecutándose en http://localhost:${PORT}`);
});
