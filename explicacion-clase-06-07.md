# Guía Rápida y Explicación · Clases 06 y 07 (VLFisioterapia)

Este documento resume de forma sencilla cómo conectar el modelo de lenguaje de **Groq** con la API de **FastAPI** y cómo añadir **memoria conversacional multi-turno**, cumpliendo paso a paso con las instrucciones de los archivos `index.html` (Clase 06) e `index (1).html` (Clase 07).

---

## 1. Resumen: ¿Qué pide cada clase y qué hace el sistema?

| Clase | Archivo Principal | Función Clave | Qué Hace |
|---|---|---|---|
| **Clase 06** | `consulta_llm.py` | `interpretar()` y `ejecutar()` | Toma lo que escribe el usuario, le pide a Groq que devuelva un plan en formato JSON (`accion`, `cliente`, `servicio`, `fecha`, `hora`, `codigo`) y llama a la ruta correcta de FastAPI (`/servicios`, `/disponibilidad`, `/citas`, etc.). |
| **Clase 07** | `chatbot_memoria.py` | `nuevo_historial()` y `procesar_turno()` | Envía una lista acumulada de mensajes `[system, user, assistant]` a Groq. Permite que el chatbot recuerde lo dicho en turnos anteriores para completar citas por partes y añade el comando `REINICIAR`. |

---

## 2. ¿Cómo se configuró el proyecto para cumplir con los HTMLs?

### Paso 1: Configurar credenciales en `.env`
Guardar fuera del código la API Key de Groq y la URL de la API:
```env
PORT=8012
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b
CHATBOT_API_URL=http://127.0.0.1:8012
```

### Paso 2: Adaptar `consulta_llm.py` a las rutas de tu FastAPI
Las diapositivas traen rutas de ejemplo (`/api/servicios`, `/api/reservas`), pero tu API real de fisioterapia tiene sus propias rutas y nombres de campos:
1. **Rutas sincronizadas**:
   - Consultar servicios ➔ `GET /servicios`
   - Disponibilidad ➔ `GET /disponibilidad?fecha=AAAA-MM-DD&servicio=...`
   - Crear cita ➔ `POST /citas` con cuerpo `{cliente, servicio, fecha, hora, confirmado: True}`.
   - Modificar cita ➔ `PATCH /citas/{codigo}/reprogramar` con `{nueva_fecha, nueva_hora, confirmado: True}`.
   - Cancelar cita ➔ `DELETE /citas/{codigo}?confirmado=true`.
2. **Normalización de servicios**:
   Si el usuario dice *"terapia manual"* o *"fisioterapia deportiva"*, la función `normalizar_servicio()` traduce automáticamente al identificador exacto de `clinica.json` (`puncion_seca`, `deportiva`, `evaluacion`, etc.) para evitar errores 422.
3. **Flujo de confirmación**:
   Si la acción cambia los datos (crear, modificar o cancelar), el código genera un resumen y pide `(s/n)` antes de llamar a FastAPI.

### Paso 3: Crear `chatbot_memoria.py` reutilizando la lógica
1. `nuevo_historial()` inicia la lista con el rol `system` y la fecha de hoy.
2. `procesar_turno()` toma la pregunta actual, la suma al historial, llama a Groq y agrega la respuesta del asistente.
3. El comando `REINICIAR` vacía la lista dejando solo `system`. **Las citas en `citas.json` no se tocan**, demostrando la separación entre el historial del chat y la base de datos.

---

## 3. ¿Solo se puede ejecutar en la terminal? (Respuesta a la duda)

**No, la terminal es solo el entorno de pruebas inicial.**

1. **Separación de responsabilidades**:
   Tanto `consulta_llm.py` como `chatbot_memoria.py` están diseñados como **módulos reutilizables**. La terminal solo tiene el bucle `while True` interactivo para verificar rápidamente que las funciones respondan bien.
2. **Integración con interfaces gráficas (Gradio / Web)**:
   - En la **Clase 08**, una interfaz web con **Gradio** o **Streamlit** importa directamente `nuevo_historial()` y `procesar_turno()` sin reescribir nada de código.
   - Cada ventana de navegador o sesión de usuario tiene su propia lista de `historial` y un botón visual de *Reiniciar*.
3. **Ejecución web interactiva directa**:
   En este proyecto, `main.py` ya incluye los endpoints `/demo/turno`, `/demo/historial` y sirve los archivos `index.html` (en `http://localhost:8012/`) e `index (1).html` (en `http://localhost:8012/clase07`), permitiendo probar las diapositivas con botones interactivos desde el navegador.

---

## 4. Prompt Recomendado para Crear o Replicar Todo el Proyecto

Si necesitas iniciar un proyecto similar desde cero con un asistente de IA, este es el prompt ideal que cubre toda la arquitectura:

```text
Actúa como un Desarrollador Senior en Python y Arquitectura de Chatbots.
Tengo una API en FastAPI que gestiona citas y servicios de un negocio local con persistencia en JSON (rutas: GET /servicios, GET /disponibilidad, POST /citas, PATCH /citas/{id}/reprogramar y DELETE /citas/{id}).

Necesito que construyas la arquitectura cliente para conectar esta API con el LLM de Groq en dos archivos modulares:

1. consulta_llm.py (Clase 06):
   - Carga variables de entorno (.env): GROQ_API_KEY, GROQ_MODEL y CHATBOT_API_URL.
   - Función peticion_json(url, metodo, datos, headers) con User-Agent compatible y forzado IPv4 para evitar bloqueos de Cloudflare.
   - Función interpretar(pregunta, clave, modelo): envía un prompt estricto a Groq solicitando ÚNICAMENTE un JSON con: accion, cliente, servicio, fecha, hora, codigo.
   - Acciones válidas: servicios, disponibilidad, crear, modificar, cancelar, consultar, fuera_de_alcance.
   - Normalizador de servicios que mapee lenguaje natural a las claves de la base de datos.
   - Función ejecutar(plan, confirmar=False): valida campos requeridos, solicita confirmación previa para operaciones de escritura, y ejecuta la llamada HTTP correspondiente hacia FastAPI.
   - Bucle interactivo CLI en main() con soporte para el comando SALIR.

2. chatbot_memoria.py (Clase 07):
   - Importa ACCIONES, ejecutar y peticion_json desde consulta_llm.py sin duplicar lógica de negocio.
   - Función nuevo_historial(): crea la lista inicial con el mensaje system y la fecha actual.
   - Función procesar_turno(pregunta, historial, clave, modelo): concatena turnos anteriores, consulta a Groq manteniendo la memoria contextual entre preguntas, ejecuta la acción en FastAPI y añade la respuesta al historial.
   - Bucle CLI en main() con soporte para el comando REINICIAR (que limpie la memoria conversacional sin alterar los registros guardados en FastAPI) y confirmación interactiva (s/n).

Asegúrate de que el código sea limpio, tenga manejo de excepciones HTTPError/URLError y que la lógica del chat esté completamente desacoplada de la base de datos.
```

---

## 5. Resumen de Comandos Rápidos

```bash
# Terminal 1: Iniciar FastAPI
source .venv/bin/activate
python main.py

# Terminal 2 (Opción A): Probar Clase 06 (Una sola intención)
source .venv/bin/activate
python consulta_llm.py

# Terminal 2 (Opción B): Probar Clase 07 (Memoria multi-turno y REINICIAR)
source .venv/bin/activate
python chatbot_memoria.py

# Ejecutar pruebas completas automatizadas
python test_integracion_completa.py
```
