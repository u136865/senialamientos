# Senialamientos

Aplicacion de escritorio para gestion de categorias, semanas y senalamientos, con integracion a WhatsApp Web para notificaciones de partidos.

El proyecto empaqueta en un instalador .exe con Electron Builder, por lo que el usuario final no necesita tener Node ni Angular instalados.

## Estructura del proyecto

- Backend Node + Express + Socket.IO: [server.js](server.js)
- Frontend Angular: [Whatsapp_Multicast](Whatsapp_Multicast)
- Shell de escritorio Electron: [electron/main.js](electron/main.js)
- Datos locales en desarrollo: [data](data)

## Caracteristicas

- Gestion de categorias con grupo de WhatsApp asociado
- Gestion de semanas y senalamientos
- Envio de notificaciones por grupo
- QR de vinculacion de WhatsApp en tiempo real
- Empaquetado instalable para Windows

## Requisitos para desarrollo

- Node.js 20 o superior recomendado
- npm 10 o superior
- Google Chrome instalado (o definir CHROME_PATH)

## Ejecutar en desarrollo

1. Instalar dependencias del backend y desktop (raiz):

   npm install

2. Instalar dependencias del frontend Angular:

   npm --prefix Whatsapp_Multicast install

3. Levantar backend:

   npm start

4. En otra terminal, levantar frontend:

   npm --prefix Whatsapp_Multicast start

## Ejecutar como app de escritorio en local

1. Compilar frontend:

   npm run build:frontend

2. Abrir la app Electron:

   npm run start:desktop

## Generar instalador .exe

Comando:

npm run dist:win

Salida esperada (en tu maquina local):

- Instalador: [dist/Senialamientos-Setup-1.0.0.exe](dist/Senialamientos-Setup-1.0.0.exe)
- App desempaquetada: [dist/win-unpacked](dist/win-unpacked)

Nota: esos archivos no se suben al codigo fuente porque [dist](dist) esta ignorado por Git.

## Publicar una Release con .exe en GitHub

Este repo incluye workflow en [release.yml](.github/workflows/release.yml) que:

- Compila el frontend
- Genera instalador con Electron Builder
- Crea/actualiza una Release en GitHub
- Sube el .exe y el .blockmap como artefactos

### Opcion 1: desde un tag (recomendado)

1. Crear y subir tag semantico:

   git tag v1.0.1
   git push origin v1.0.1

2. GitHub Actions publicara automaticamente la Release v1.0.1.
3. Descarga el ejecutable desde:

   https://github.com/u136865/senialamientos/releases

   o desde la ultima version publicada:

   https://github.com/u136865/senialamientos/releases/latest

### Opcion 2: manual

Desde Actions, ejecutar el workflow Release Desktop Manualmente y definir la version (por ejemplo 1.0.2).

## Datos sensibles y privacidad

Los siguientes datos no se suben al repositorio:

- Sesion de WhatsApp: .wwebjs_auth, .wwebjs_cache
- Datos de negocio locales: archivos JSON en [data](data)
- Binarios y builds: [dist](dist), [Whatsapp_Multicast/dist](Whatsapp_Multicast/dist)

Revisar reglas en [/.gitignore](.gitignore).

## Notas tecnicas

- En empaquetado desktop, los datos de usuario se guardan en AppData del sistema (no dentro del repo).
- Si Chrome no esta en la ruta por defecto, define CHROME_PATH antes de ejecutar.

## Licencia

Uso interno o segun politicas del repositorio.
