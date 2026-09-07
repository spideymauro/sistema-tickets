# Sistema de Tickets de Soporte 🎫

Bienvenido. Este documento te va a explicar **todo, con calma y paso a paso**, para que puedas
prender este sistema en tu computadora, aunque sea la primera vez que hagas algo así. No necesitas
saber programar para seguir esta guía.

---

## 1. ¿Qué es esto? 🤔

Es un sistema para que las personas de una empresa puedan pedir ayuda de soporte técnico (por
ejemplo: "mi computadora no prende", "necesito un teclado nuevo") hablando con un **robot de chat**
(un "bot"), sin necesidad de crear ninguna cuenta. Y del otro lado, hay un panel donde el equipo de
soporte ve esas peticiones y las resuelve.

Está hecho de **3 piezas** que trabajan juntas:

| Pieza | ¿Qué hace? | ¿En qué lenguaje está? |
|---|---|---|
| 🖥️ **Frontend** | Lo que ve la gente: el chat y el panel | Next.js (una herramienta para hacer páginas web) |
| 🧠 **Backend** | El "cerebro": guarda los datos, decide las reglas | Node.js + Express |
| 📧 **n8n** | Manda los correos automáticos | n8n (una herramienta de automatización) |

---

## 2. Antes de empezar: cosas que debes descargar 📥

Necesitas instalar estos programas en tu computadora. Dale clic a cada nombre para ir a la página
de descarga oficial:

| Programa | ¿Para qué sirve? | Descárgalo aquí |
|---|---|---|
| **Node.js** | Es lo que hace funcionar tanto el Backend como el Frontend. Es obligatorio. | [nodejs.org/es/download](https://nodejs.org/es/download) (elige la versión "LTS", que significa que es la más estable) |
| **Docker Desktop** | Sirve para correr n8n (el que manda los correos). Solo lo necesitas si quieres que lleguen correos automáticos. | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **ngrok** | Le da una dirección pública a n8n, para que el Backend pueda hablarle. También opcional. | [ngrok.com/download](https://ngrok.com/download) |
| **Un editor de código** (opcional, pero ayuda mucho) | Para poder ver y cambiar los archivos fácilmente. | [code.visualstudio.com/download](https://code.visualstudio.com/download) (se llama "VS Code") |

También vas a necesitar:

- Una cuenta de **Gmail** (para que n8n mande los correos desde ahí).
- Opcionalmente, una cuenta gratis en [Google AI Studio](https://aistudio.google.com/) si quieres
  activar la parte de Inteligencia Artificial (esto es un extra, el sistema funciona bien sin
  esto también).

---

## 3. Las "llaves secretas" (variables de entorno) 🔑

El sistema necesita unos datos secretos para funcionar — como contraseñas especiales que tú
inventas. Se guardan en un archivo llamado `.env`. Aquí te explico **cada una, en español sencillo**:

### Para el Backend

| Nombre | ¿Qué es, en palabras simples? | Ejemplo |
|---|---|---|
| `JWT_SECRET` | Una palabra secreta larga que el sistema usa para "firmar" que un agente sí inició sesión de verdad. Tú la inventas, entre más larga y rara, mejor. | `mi-super-secreto-2026-xyz` |
| `N8N_WEBHOOK_URL` | La dirección de internet donde vive tu n8n, para que el Backend le pueda avisar "manda un correo". | `https://algo.ngrok-free.app/webhook/tickets` |
| `N8N_WEBHOOK_SECRET` | Otra palabra secreta, para que solo tu Backend (y nadie más) pueda decirle a n8n que mande correos. | `otro-secreto-123` |
| `GEMINI_API_KEY` | (Opcional) Tu llave personal para usar la Inteligencia Artificial de Google. | `AIzaSy...` |

### Para el Frontend

| Nombre | ¿Qué es? | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | La dirección de internet donde vive tu Backend, para que el Frontend sepa a dónde mandar la información. | `http://localhost:3001` (si es en tu compu) o tu dirección de Render |

**¿Cómo se ponen estas "llaves"?** Creas un archivo de texto llamado exactamente `.env` (en el
Backend) o `.env.local` (en el Frontend), y escribes una línea por cada una, así:

```
JWT_SECRET=mi-super-secreto-2026-xyz
N8N_WEBHOOK_URL=https://algo.ngrok-free.app/webhook/tickets
```

---

## 4. Cómo prender el Backend (el cerebro) 🧠

1. Abre una terminal (en Windows: busca "cmd" en el menú de inicio).
2. Entra a la carpeta `backend` con: `cd backend`
3. Instala todo lo necesario con: `npm install` (tarda uno o dos minutos, es normal)
4. Crea tu archivo `.env` como explicamos arriba.
5. Enciende el servidor con: `npm start`
6. Si ves el mensaje "Servidor backend corriendo en http://localhost:3001", ¡ya funciona! 🎉

La primera vez que prendes esto, el sistema **solito** crea:
- Un usuario administrador de prueba (correo: `maurocontrerasurrutia@gmail.com`, contraseña: `admin123`)
- 6 tickets de ejemplo, para que veas cómo se ve el panel con datos

---

## 5. Cómo prender el Frontend (lo que se ve) 🖥️

1. Abre **otra** terminal nueva (deja la del Backend abierta, no la cierres).
2. Entra a la carpeta `frontend` con: `cd frontend`
3. Instala todo con: `npm install`
4. Crea tu archivo `.env.local` como explicamos arriba.
5. Enciende con: `npm run dev`
6. Abre tu navegador en `http://localhost:3000` — ahí está el chat del bot.
7. El panel para el equipo de soporte está en `http://localhost:3000/admin/login`

---

## 6. Problemas comunes y cómo resolverlos 🔧

### "Docker Desktop no prende" o dice "Virtualization support not detected"

Esto pasa porque tu computadora tiene "apagada" una función especial que Docker necesita para
funcionar, llamada **virtualización**. Hay que activarla en **2 lugares distintos**:

#### Paso A: Activarla en el BIOS de tu computadora

El BIOS es una pantalla especial que aparece **antes** de que Windows se abra.

1. Reinicia tu computadora.
2. En cuanto la pantalla se ponga negra (antes del logo de Windows), presiona repetidamente una
   tecla — depende de la marca de tu compu: `F2`, `F10`, `F12`, `Supr/Delete`, o `Esc`.
3. Busca una sección que diga algo como "Advanced", "CPU Configuration", o "Security".
4. Busca una opción llamada "Virtualization Technology", "Intel VT-x", o "SVM Mode" (si tu compu
   es AMD).
5. Cámbiala de "Disabled" a "Enabled".
6. Busca "Save & Exit" (usualmente con la tecla `F10`) y confirma. Tu compu se reiniciará sola.

#### Paso B: Activar las características de Windows

1. En el menú de inicio de Windows, escribe: **"Activar o desactivar las características de Windows"**
2. Ábrelo, y busca (con las casillas para marcar) estas dos opciones:
   - ✅ **Plataforma de máquina virtual** ("Virtual Machine Platform")
   - ✅ **Subsistema de Windows para Linux** ("Windows Subsystem for Linux")
3. Márcalas ambas, dale "Aceptar", y si te pide reiniciar, hazlo.

#### Paso C: Instalar Ubuntu (el "Linux" que Docker usa por dentro)

Docker, por dentro, en realidad usa una mini versión de Linux (normalmente Ubuntu) para poder
funcionar en Windows. A veces hay que instalarla a mano:

1. Abre una terminal (cmd) y escribe: `wsl --install -d Ubuntu`
2. Espera a que termine de descargar e instalar (puede tardar varios minutos).
3. Te va a pedir crear un usuario y contraseña para esa "mini Ubuntu" — invéntalos, no tienen que
   ser los mismos que usas en Windows.
4. Reinicia tu computadora una vez más.
5. Abre Docker Desktop de nuevo — ya debería prender sin el error.

**Nota importante**: no siempre necesitas los 3 pasos — a veces con el A y B ya funciona. Solo haz
el C si sigue sin funcionar después de A y B.

### "Perdí mi workflow de n8n" o "n8n me pide crear cuenta otra vez"

Esto pasa si borras y vuelves a crear el contenedor de Docker sin conectarlo al mismo lugar donde
se guardan tus datos (un "volumen"). Para evitarlo, siempre usa este comando (fíjate en la parte
`-v n8n_data:...`, esa es la que guarda tus datos):

```
docker run -d --name n8n-tickets -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n
```

Mientras no borres ese volumen (`docker volume rm n8n_data`), tu workflow siempre estará ahí,
aunque apagues y prendas el contenedor muchas veces.

### "Mis datos desaparecieron" (si lo subiste a Render gratis)

Esto es normal y esperado — el plan gratis de Render **no guarda los archivos para siempre**. Cada
vez que subes código nuevo, o cada vez que el servicio "despierta" después de estar dormido un
rato, los datos se reinician. Por eso el sistema crea solo un usuario de prueba y tickets de
ejemplo cada vez que arranca — para que nunca te quedes sin nada que ver.

---

## 7. Licencias — ¿esto es gratis de verdad? ✅

Aquí te explico, en español sencillo, qué tan gratis es cada cosa que usamos:

| Herramienta | ¿Es gratis? | Detalle importante |
|---|---|---|
| Node.js, Express, Next.js, React | Sí, 100% gratis, para siempre, sin importar el tamaño de tu empresa | Son de "código abierto" (open source), cualquiera los puede usar y ver cómo están hechos |
| SQLite | Sí, 100% gratis | Es de "dominio público", literalmente de nadie y de todos |
| **Docker Desktop** | Gratis para uso personal o empresas chicas | ⚠️ Si tu empresa tiene **más de 250 empleados** o gana más de 10 millones de dólares al año, Docker pide que se pague una licencia. Para este proyecto de prueba, no hay problema |
| **n8n** | Gratis para uso propio (auto-hospedado, como hicimos aquí) | ⚠️ Tiene una licencia especial llamada "Sustainable Use License" — puedes usarlo gratis para tu empresa, pero **no puedes revenderlo** como si fuera tu propio producto a otras empresas |
| **Google Gemini (IA)** | Gratis con un límite de uso | Tiene un tope de peticiones gratis por minuto; si lo pasas, hay que esperar o pagar un plan |
| Render, Vercel, ngrok | Gratis con límites | Cada uno tiene un "plan gratis" que alcanza perfecto para pruebas, pero no para un negocio grande en producción real |

**En resumen**: para armar esta prueba y mostrarla, **todo es gratis**. Si algún día se quiere usar
esto de verdad, en una empresa grande, con muchos usuarios todo el tiempo, ahí sí conviene revisar
pagar algunos de estos planes.

---

## 8. Uso de Inteligencia Artificial en este proyecto 🤖

Aquí explicamos, con toda honestidad, dónde y cómo se usó IA:

**1. Para diseñar el proyecto**: se usó IA conversacional (Gemini y Claude) para pensar la
estructura de la base de datos, las reglas del negocio, y el diseño del flujo del bot — como una
lluvia de ideas con ayuda.

**2. Dentro del programa mismo**: el bot usa la Inteligencia Artificial de Google (Gemini) como un
"segundo intento" de ayuda — si no encuentra una respuesta rápida con sus reglas simples, le
pregunta a la IA si puede sugerir algo, antes de crear el ticket. Si la IA falla o tarda mucho
(cosa que puede pasar), el sistema simplemente sigue funcionando normal, sin IA — nunca se traba
ni deja al usuario esperando para siempre.

---

## 9. Para probarlo ya mismo 🚀

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `maurocontrerasurrutia@gmail.com` | `admin123` |

Entra al panel en `/admin/login`, y desde ahí puedes crear más agentes o administradores.

---

## 10. Cosas que todavía no hace este sistema (por ahora) 📋

- No cierra los tickets solo después de 72 horas (esa parte se dejó para una versión futura).
- Si tu compu se apaga, el envío de correos deja de funcionar hasta que la vuelvas a prender
  (porque n8n vive ahí, no en internet).
- No es para usarse con miles de personas al mismo tiempo — es un proyecto de prueba/demostración.
