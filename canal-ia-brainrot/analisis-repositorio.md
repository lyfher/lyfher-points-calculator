# Análisis: AI-Content-Automation-Engine
**Repo:** https://github.com/hans1801/AI-Content-Automation-Engine  
**Video:** https://www.youtube.com/watch?v=IM8PfqjpvaM  
**Analizado:** 2026-04-28

---

## ✅ VEREDICTO DE SEGURIDAD: SEGURO PARA CLONAR

Sin malware, sin backdoors, sin código de exfiltración. Detalles abajo.

---

## Análisis de seguridad

| Punto | Estado | Detalle |
|-------|--------|---------|
| Imagen Docker | ✅ Limpia | `python:3.13-slim` + ffmpeg, sin curl-pipe-bash |
| Secrets hardcodeados | ✅ Ninguno | Solo `.env.sample` con placeholder |
| Dependencias conocidas | ✅ Todas legítimas | pandas, pydantic, google-genai, pillow, rich |
| Red en build | ✅ No | Solo apt-get e instalación de Poetry estándar |
| Puertos expuestos | ✅ Ninguno | No es servidor |
| Historial de commits | ✅ Coherente | 5 commits, autor único, progresión lógica |
| `selenium` (sospechoso) | ⚠️ Sin usar | Está en dependencias pero GitHub search = 0 archivos. Probablemente leftover de versión anterior. No hay código que lo use. |

**Único requisito de credenciales:** `GEMINI_API_KEY` en archivo `.env` local. Tu clave nunca sale del entorno.

---

## Qué hace el proyecto

Pipeline de 7 pasos que genera videos shorts automatizados de cero:

```
Script (Gemini) → Imágenes (Imagen) → Audio TTS → Video (FFmpeg) → Subtítulos (Whisper) → Música → Rename
```

**Herramientas usadas:**
- **Google Gemini API** — genera el guión, imágenes y narración de voz
- **Whisper.cpp** — transcripción local (offline) para generar subtítulos .SRT
- **FFmpeg** — ensambla imágenes + audio, incrusta subtítulos y música de fondo
- **Poetry** — manejo de dependencias Python
- **Pydantic** — estructura los prompts como JSON schemas tipados

**Arquitectura:**
- `tools/` → componentes atómicos reutilizables (generadores individuales)
- `flows/` → orquestadores que llaman a los tools en secuencia
- `prompt_shorts/` y `prompt_longs/` → nichos de contenido intercambiables
- `.rules/` → convenciones de código y patrones de arquitectura

**Formatos soportados:**
- Shorts (9:16) — videos verticales tipo TikTok/YouTube Shorts
- Longs (16:9) — videos horizontales largos

---

## Cómo se usa

```bash
# Clonar y configurar
git clone https://github.com/hans1801/AI-Content-Automation-Engine
cd AI-Content-Automation-Engine
poetry install

# Crear .env con tu API key
cp .env.sample .env
# Editar .env: GEMINI_API_KEY=tu-key-aqui

# Descargar modelo Whisper (manual)
# Poner ggml-small.bin en models/whisper/

# Ejecutar pipeline completo (shorts)
make icg-s-all

# O paso a paso
make icg-s-step1   # genera guión
make icg-s-step2   # genera imágenes
make icg-s-step3   # genera audio
make icg-s-step4   # ensambla video
make icg-s-step5   # agrega subtítulos
make icg-s-step6   # agrega música
make icg-s-step7   # renombra output final
```

**Requisitos del sistema:**
- Python 3.11+
- Poetry instalado
- FFmpeg instalado
- Whisper.cpp compilado con modelo `ggml-small.bin`
- Google Gemini API Key (tiene tier gratuito)

---

## Estado del proyecto

- **Repo joven:** creado en abril 2026, ~5 commits
- **38 estrellas, 24 forks** — comunidad pequeña pero hay interés
- **Sin licencia declarada** — código disponible pero sin términos formales de uso/redistribución
- **Autor único:** hans1801, activo

---

## Próximos pasos para el canal

1. **Setup local** — instalar dependencias y probar con el niche de finanzas incluido
2. **Entender los prompts** — revisar `prompt_shorts/finance/` para ver el guión base
3. **Customizar el niche** — crear nuestro propio módulo de contenido brainrot
4. **Mejorar los prompts** — iterar sobre el guión, voces, estilo de imágenes
5. **Automatizar subida** — el repo no incluye auto-upload a YouTube, eso lo agregaríamos
