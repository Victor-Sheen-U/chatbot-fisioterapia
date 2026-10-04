// Código para el nodo Custom JS Function en Flowise 2.2+ (VLFisioterapia)
// Configuración de URL según el entorno de ejecución de Flowise:
// Si Flowise corre en Docker Desktop y FastAPI en el Host:
const API_URL = 'http://host.docker.internal:8012';
// Si Flowise corre con npm directamente en el host local:
// const API_URL = 'http://127.0.0.1:8012';

const fetch = require('node-fetch');

const mensaje = String($input || '').trim();
const session_id = $flow.sessionId || $flow.chatId;

if (!session_id) {
    return 'No se detectó un identificador de sesión válido. Por favor, reinicia la conversación.';
}

let datos = {};
const comandosEspeciales = ['confirmar', 'abortar', 'no', '/reset', 'cancelar solicitud'];

if (!comandosEspeciales.includes(mensaje.toLowerCase())) {
    try {
        let textoRaw = typeof $extraccion === 'string' ? $extraccion.trim() : JSON.stringify($extraccion);
        // Limpiar posibles bloques markdown de código ```json ... ```
        textoRaw = textoRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        datos = JSON.parse(textoRaw);
        if (!datos || Array.isArray(datos) || typeof datos !== 'object') {
            throw new Error('Estructura no válida');
        }
    } catch (_) {
        return 'No pude interpretar los datos de tu mensaje. Por favor indícanos: tratamiento deseado, fecha (AAAA-MM-DD), hora y tu nombre completo.';
    }
}

try {
    const response = await fetch(API_URL + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, mensaje, datos }),
        timeout: 10000
    });

    const resultado = await response.json();
    if (typeof resultado.respuesta === 'string') {
        return resultado.respuesta;
    }

    if (response.status === 422) {
        return 'Los datos ingresados no cumplen con el formato requerido. Recuerda usar formato de fecha AAAA-MM-DD y hora HH:MM.';
    }
    if (response.status === 409) {
        return 'El turno seleccionado no está disponible en este momento. Por favor elige otro horario.';
    }

    return 'La API de VLFisioterapia no devolvió una respuesta esperada. Revisa los logs del servidor.';
} catch (error) {
    return 'No se pudo establecer conexión con el servidor de citas de VLFisioterapia. Verifica que la API esté activa en el puerto 8012.';
}
