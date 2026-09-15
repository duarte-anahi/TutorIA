# TutorIA

[English](README.md) · **Español**

Un tutor socrático para trabajos de escritura académica. En lugar de escribir el texto por el estudiante, TutorIA lo guía durante el proceso con una pregunta corta por vez.

![Interfaz de TutorIA](docs/screenshot.png)

## Cómo funciona

El estudiante escribe en el editor de la izquierda y conversa con el tutor a la derecha. El tutor lee el chat y el borrador actual, y acompaña al estudiante a lo largo de cuatro etapas:

| Etapa | Objetivo |
|---|---|
| **A. Condiciones previas** | Reunir materiales y definir cómo estudiarlos |
| **B. Puesta en texto** | Comprender la consigna, planificar y redactar una primera versión completa |
| **C. Revisión** | Detectar y resolver problemas de claridad, estructura y corrección, citando el propio texto del estudiante |
| **D. Cierre** | Validar el texto final y reflexionar sobre el proceso de escritura |

El modelo decide cuándo el estudiante está listo para avanzar: cuando se cumple el objetivo de una etapa, agrega una etiqueta oculta `[AVANZAR]` a su respuesta y el frontend avanza la barra de progreso.

### Decisiones de diseño

- **Los prompts están en archivos YAML, no en el código.** `backend/prompts/base.yaml` define el rol, los límites y el tono del tutor; cada etapa tiene su propio archivo. La pedagogía se puede ajustar sin tocar Python.
- **El tutor nunca escribe contenido para entregar.** No redacta trabajos, no inventa citas y hace una sola pregunta por turno.
- **Corre localmente con Ollama.** Sin claves de API y sin enviar el texto del estudiante a terceros.

## Tecnologías

- **Backend:** Python, FastAPI, LangChain, Ollama
- **Frontend:** React, Vite, Tailwind CSS
- **Modelos:** Llama 3.1 (por defecto), Gemma y Qwen vía Ollama — la lista se define en `MODELOS_DISPONIBLES` en `main.py`

## Estructura del proyecto

```
backend/
  main.py            API: armado del prompt, historial del chat, selección de modelo
  prompts/
    base.yaml        Rol, límites y tono del tutor
    etapa_a.yaml     Un archivo por etapa (A–D)
    ...
frontend/
  src/App.jsx        Editor, chat e indicador de progreso
```

## Cómo correrlo

**Requisitos:** Python 3.10+, Node.js 18+ y [Ollama](https://ollama.com).

1. Descargar un modelo:
   ```bash
   ollama pull llama3.1
   ```
2. Iniciar el backend:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate        # macOS/Linux: source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
3. Iniciar el frontend (en otra terminal):
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```
4. Abrir http://localhost:5173
