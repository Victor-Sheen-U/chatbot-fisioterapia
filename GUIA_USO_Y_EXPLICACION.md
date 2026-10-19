# Guía de Uso y Explicación · Laboratorio 08 y 09
## Sistema de Citas VLFisioterapia (Gradio + SQLite + FastAPI)

Este documento explica de forma clara, directa y sencilla qué cambios se implementaron en el proyecto, cómo funciona la nueva arquitectura y cuáles son los pasos exactos y requerimientos para poner en marcha el sistema completo.

---

## 1. Explicación Sencilla: ¿Qué se implementó y por qué?

### El problema anterior
En las clases anteriores, el sistema guardaba las citas médicas en un archivo de texto llamado `citas.json`:
- **Riesgo de corrupción y bloqueos**: Si dos usuarios intentaban pedir una cita exactamente al mismo tiempo, el archivo de texto podía dañarse o uno de los dos sobrescribía la información del otro.
- **Agenda no diferenciada**: El sistema no distinguía si un fisioterapeuta específico estaba libre o no. Si había una cita a las 08:00, asumía que la clínica entera estaba ocupada, impidiendo que otro fisioterapeuta atendiera a otro paciente a esa misma hora.
- **Interacción limitada**: Solo se podía interactuar desde la consola (terminal de comandos) o enviando peticiones técnicas por código.

---

### Lo que se implementó ahora

```
                                 ┌────────────────────────┐
                                 │   Usuario / Paciente   │
                                 └───────────┬────────────┘
                                             │
                                             ▼
                             ┌────────────────────────────────┐
                             │ Interfaz Web Gradio (Puerto    │
                             │ 7860)                          │
                             │ - Conversación multi-turno     │
                             │ - Sesión aislada por pestaña   │
                             └───────────────┬────────────────┘
                                             │
                                             ▼
                             ┌────────────────────────────────┐
                             │ Cerebro LLM (Groq / Llama)     │
                             │ - Interpreta lenguaje natural  │
                             │ - Extrae paciente, fecha, hora │
                             └───────────────┬────────────────┘
                                             │
                                             ▼
                             ┌────────────────────────────────┐
                             │ Backend FastAPI (Puerto 8012)  │
                             │ - Reglas de negocio y horarios │
                             │ - Control de códigos HTTP      │
                             └───────────────┬────────────────┘
                                             │
                                             ▼
                             ┌────────────────────────────────┐
                             │ Base de Datos SQLite           │
                             │ (reservas.db)                  │
                             │ - Transacciones BEGIN IMMEDIATE│
                             │ - Agendas por especialista     │
                             └────────────────────────────────┘
```

1. **Base de Datos Relacional SQLite (`reservas.db`)**:
   - Se reemplazó el archivo `citas.json` por una base de datos SQLite profesional y ligera llamada `reservas.db`.
   - **Transacciones seguras (`BEGIN IMMEDIATE`)**: Ahora, cuando un paciente agenda o reprograma, la base de datos se bloquea durante una fracción de segundo para comprobar que el horario esté libre y registrarlo. Si otra persona intenta tomar ese mismo cupo en el mismo instante, el sistema le informa con total seguridad que el horario ya fue tomado (código de conflicto 409).
   - **Migración automática**: Las 14 citas históricas que estaban en `citas.json` fueron migradas al 100% dentro de `reservas.db` sin perder ningún dato (precios, teléfonos, historial de reprogramaciones, etc.).

2. **Gestión de Disponibilidad por Especialista**:
   - En la clínica atienden tres profesionales: **Mariana**, **Carlos** y **Valeria**. Cada uno atiende servicios diferentes (por ejemplo, Mariana y Carlos hacen evaluaciones; Mariana hace punción seca; Valeria hace drenaje linfático).
   - El sistema ahora valida el horario de atención de cada día de la semana (lunes a viernes de 07:00 a 19:00, sábados de 08:00 a 14:00, domingos cerrado).
   - Dos pacientes **sí pueden tener cita a la misma hora** siempre y cuando los atiendan fisioterapeutas distintos.
   - Si el paciente no especifica con quién desea la cita, el sistema le asigna automáticamente el primer especialista disponible para ese servicio.

3. **Interfaz Gráfica Amigable con Gradio (`app_gradio.py`)**:
   - Se integró una aplicación web moderna que corre en el navegador (`http://127.0.0.1:7860`).
   - Permite chatear de forma fluida y natural para consultar precios, ver horarios libres, agendar citas, reprogramar o cancelar.
   - **Sesiones independientes**: Cada persona que abra el navegador tiene su propia conversación privada; no se mezclan los mensajes entre usuarios.
   - **Botón "Reiniciar conversación"**: Permite comenzar de cero el chat sin borrar ninguna de las citas guardadas en la base de datos.

4. **Compatibilidad Total**:
   - La API de FastAPI sigue funcionando exactamente igual en el puerto **8012** con sus rutas (`/citas`, `/disponibilidad`, `/servicios`, etc.), garantizando que todas las aplicaciones existentes sigan funcionando sin cambios.

---

## 2. Requerimientos Previos

Antes de ejecutar el proyecto, asegúrate de contar con lo siguiente:

1. **Sistema Operativo**: Linux, macOS o Windows (PowerShell o WSL).
2. **Python**: Versión 3.10 o superior (el proyecto cuenta con su entorno virtual en `./.venv`).
3. **Archivo de Configuración `.env`**:
   Debe estar presente en la raíz del proyecto (`chatbot-fisioterapia/.env`) con las siguientes variables:
   ```env
   PORT=8012
   CHATBOT_API_URL=http://127.0.0.1:8012
   GROQ_API_KEY=tu_api_key_de_groq_aqui
   GROQ_MODEL=openai/gpt-oss-120b
   ```
   *(Nota: Por seguridad, nunca compartas ni subas tu archivo `.env` a repositorios públicos).*
4. **Archivo `clinica.json`**:
   Contiene el catálogo oficial de servicios, precios, duración en minutos, profesionales asignados y horarios de atención.

---

## 3. Guía Paso a Paso: Cómo Ejecutar y Probar el Sistema

Sigue estos pasos en orden para encender y verificar todo el proyecto:

### Paso 1: Activar el Entorno Virtual

Abre tu terminal en la carpeta del proyecto (`chatbot-fisioterapia`):

- **En Linux o macOS**:
  ```bash
  source .venv/bin/activate
  ```
- **En Windows (PowerShell)**:
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```

---

### Paso 2: Verificar Dependencias

Asegúrate de que todas las librerías necesarias estén instaladas:
```bash
pip install -r requirements.txt
```
*(Incluye FastAPI, Uvicorn, Gradio, Pydantic y `pysqlite3-binary` en caso de que el sistema operativo lo requiera).*

---

### Paso 3: Verificar o Migrar la Base de Datos SQLite

Para comprobar que las citas históricas estén cargadas correctamente en `reservas.db` ejecuta:
```bash
python almacen_sqlite.py --migrar citas.json
```
**Respuesta esperada:**
```json
{
  "importadas": 0,
  "ya_existentes": 14
}
```
*(Indica que las 14 citas históricas ya están seguras dentro de `reservas.db`).*

---

### Paso 4: Ejecutar las Pruebas de Calidad Automatizadas

Antes de iniciar los servidores, puedes comprobar que todas las reglas de negocio, la base de datos y la conexión con el LLM funcionen al 100%:

1. **Pruebas de la API y de SQLite**:
   ```bash
   python probar_fisioterapia.py
   ```
   **Salida esperada:**
   ```text
   Iniciando pruebas de VLFisioterapia...
   Todas las pruebas pasaron satisfactoriamente (100% OK).
   ```

2. **Pruebas de Integración Completa (FastAPI + Groq + Memoria)**:
   ```bash
   python test_integracion_completa.py
   ```
   **Salida esperada:**
   ```text
   ¡TODAS LAS PRUEBAS DE INTEGRACIÓN PASARON EXITOSAMENTE (100% OK)!
   ```

---

### Paso 5: Iniciar el Servidor Backend (FastAPI)

En tu primera terminal (con el entorno `.venv` activo), arranca la API:
```bash
python main.py
```
*(O también: `uvicorn main:app --host 127.0.0.1 --port 8012`)*

- **Servidor activo en**: `http://127.0.0.1:8012`
- **Documentación interactiva Swagger**: `http://127.0.0.1:8012/docs`

> **Nota:** Deja esta terminal abierta para que el servidor siga atendiendo peticiones.

---

### Paso 6: Iniciar la Interfaz Web (Gradio)

Abre una **segunda terminal**, dirígete a la carpeta del proyecto, activa el entorno virtual y ejecuta:
```bash
source .venv/bin/activate   # En Windows: .\.venv\Scripts\Activate.ps1
python app_gradio.py
```

- Verás un mensaje en consola indicando:
  ```text
  Running on local URL:  http://127.0.0.1:7860
  ```
- Abre tu navegador web (Chrome, Edge, Firefox, etc.) e ingresa a:
  **`http://127.0.0.1:7860`**

---

## 4. Cómo Usar el Chatbot en la Interfaz Web

Una vez abierta la página en `http://127.0.0.1:7860`, puedes interactuar en español como si hablaras con la recepcionista de la clínica:

### 1. Consultar Tratamientos y Precios
> **Tú escribes:** *¿Qué servicios ofrecen y cuánto cuestan?*  
> **Chatbot responde:** Te listará los tratamientos (Evaluación inicial, Punción seca, Fisioterapia deportiva, etc.) con sus respectivos precios en pesos colombianos (COP).

### 2. Consultar Horarios Disponibles
> **Tú escribes:** *¿Qué disponibilidad tienen para una evaluación el 2026-10-21?*  
> **Chatbot responde:** Consultará la base de datos `reservas.db` en tiempo real y te mostrará los horarios libres (por ejemplo: 07:00, 07:30, 08:00, etc.).

### 3. Agendar una Cita (Conversación por partes o directa)
> **Tú escribes:** *Quiero agendar una evaluación para Mariana Gomez el 2026-10-21 a las 07:00.*  
> **Chatbot responde:**  
> *"Voy a crear la cita: servicio=evaluacion, paciente=Mariana Gomez, fecha=2026-10-21, hora=07:00. ¿Confirmas la operación? (s/n)"*  
> **Tú escribes:** *Sí*  
> **Chatbot responde:** Te entregará la confirmación con el código único de cita, por ejemplo: `VF-21C3C5A274`.

### 4. Cancelar o Reprogramar una Cita
> **Tú escribes:** *Deseo cancelar mi cita con código VF-21C3C5A274.*  
> **Chatbot responde:** Solicitará tu confirmación (`s/n`) y, al confirmar, cancelará la cita en la base de datos liberando ese horario para otros pacientes.

### 5. Botón "Reiniciar conversación"
- Si deseas empezar una conversación nueva sin que el asistente recuerde los mensajes anteriores, pulsa el botón **Reiniciar conversación**.
- Esto solo limpia la memoria de la pantalla actual; **no elimina ninguna cita guardada en la base de datos**.

---

## 5. Pruebas Rápidas desde la Terminal (Opcional vía cURL)

Si quieres verificar que la API responde sin abrir el navegador, puedes ejecutar en otra terminal:

```bash
# 1. Consultar el catálogo de servicios
curl -s http://127.0.0.1:8012/servicios

# 2. Consultar disponibilidad para un día específico
curl -s "http://127.0.0.1:8012/disponibilidad?fecha=2026-10-21&servicio=evaluacion"

# 3. Consultar una cita existente por su código
curl -s http://127.0.0.1:8012/citas/VF-01A2B3C4D5
```

---

## 6. Ejecución Alternativa con Docker Compose

Si prefieres ejecutar el sistema dentro de contenedores Docker:

1. Asegúrate de tener instalado y activo Docker Desktop o Docker Engine.
2. Ejecuta en la raíz del proyecto:
   ```bash
   docker compose up --build
   ```
3. El archivo `docker-compose.yml` monta automáticamente `./reservas.db:/app/reservas.db`. Esto garantiza que todas las citas que se guarden o modifiquen dentro del contenedor queden persistidas en tu máquina.

---

## 7. Preguntas Frecuentes y Solución de Problemas

- **¿Qué ocurre si dos personas intentan reservar la misma hora con el mismo fisioterapeuta?**  
  El primer usuario que confirme la reserva se queda con el cupo. El segundo usuario recibirá un mensaje amigable indicando que ese horario ya fue ocupado y el sistema le ofrecerá las horas restantes disponibles (error 409).

- **¿Dónde quedan guardadas las citas?**  
  En el archivo `reservas.db` ubicado en la carpeta principal. Si apagas tu computadora o reinicias el servidor, la información permanece intacta.

- **Error: `Address already in use` (Puerto 8012 o 7860 ocupado)**:  
  Ocurre si dejaste una instancia anterior del servidor ejecutándose en segundo plano. Para liberarlo:
  - En Linux: `fuser -k 8012/tcp` o `fuser -k 7860/tcp`
  - En Windows: Cierra la ventana de consola correspondiente o termina el proceso desde el Administrador de Tareas.

- **Error: `No module named 'fastapi'`**:  
  Significa que olvidaste activar el entorno virtual. Ejecuta `source .venv/bin/activate` (o `.\.venv\Scripts\Activate.ps1` en Windows) antes de correr cualquier comando de Python.
