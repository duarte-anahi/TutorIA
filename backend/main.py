import yaml
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.llms import Ollama
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel
from typing import Optional


MODELOS_DISPONIBLES = ["llama3.1", "gemma4:latest", "qwen3.5:9b"]
MODELO_DEFAULT = "llama3.1"
ETAPAS = ["etapa_a", "etapa_b", "etapa_c", "etapa_d"]
ETAPA_FALLBACK = {
    "etapa": "Desconocida",
    "objetivo": "Guiar al alumno",
    "fases": "Preguntá en qué lo podés ayudar."
}


class Mensaje(BaseModel):
    texto: str
    texto_borrador: Optional[str] = ""
    etapa_actual: Optional[str] = "etapa_a"
    modelo: Optional[str] = MODELO_DEFAULT
    historial: Optional[list] = []


def cargar_yamls() -> dict:
    prompts = {}

    with open("prompts/base.yaml", "r", encoding="utf-8") as f:
        prompts["base"] = yaml.safe_load(f)

    for etapa_id in ETAPAS:
        ruta = f"prompts/{etapa_id}.yaml"
        try:
            with open(ruta, "r", encoding="utf-8") as f:
                prompts[etapa_id] = yaml.safe_load(f)
        except FileNotFoundError:
            print(f"⚠️  No se encontró {ruta}. Usando fallback.")
            prompts[etapa_id] = ETAPA_FALLBACK

    return prompts


def construir_prompt_sistema(etapa_id: str, prompts: dict) -> str:
    base = prompts["base"]
    etapa = prompts.get(etapa_id, prompts["etapa_a"])

    fases_raw = etapa.get("fases_y_herramientas", "") or etapa.get("fases", "")
    fases_final = fases_raw.get("estrategia_principal", "") if isinstance(fases_raw, dict) else fases_raw

    instruccion_especifica = ""
    if etapa_id == "etapa_d":
        instruccion_especifica = """
        REGLA DE ORO PARA ESTA ETAPA: El texto ya está terminado. 
        Tu única misión es validar lo escrito, felicitar al estudiante y preguntar por su experiencia. 
        Bajo ninguna circunstancia pidas nuevas correcciones o cambios.
        """

    return f"""
    {base.get('rol_general', '')}
    
    LIMITES:
    {base.get('limites', '')}
    
    TONO:
    {base.get('tono', '')}
    
    ETAPA ACTUAL: {etapa.get('etapa', '')}
    OBJETIVO: {etapa.get('objetivo', '')}
    FASES A EVALUAR: {etapa.get('estrategia', '')}
    {fases_final}
    {instruccion_especifica}

    INSTRUCCIÓN FINAL INQUEBRANTABLE: 
    Respondé ahora mismo usando EXCLUSIVAMENTE voseo rioplatense (ej: tenés, podés, hacé, contame). Está ESTRICTAMENTE PROHIBIDO usar el pronombre "tú", o verbos como "tienes", "puedes", "quieres" o "usted". Hacé una sola pregunta corta y mantené tu rol de tutor.
    
    EVALUACIÓN DE PROGRESO (SECRETO):
    Si analizando el texto del editor considerás que el estudiante ya cumplió completamente el OBJETIVO de esta etapa y está listo para pasar a la siguiente fase, agregá EXACTAMENTE la etiqueta [AVANZAR] al final de tu respuesta. Si aún debe reflexionar o mejorar el texto en esta etapa, NO pongas la etiqueta.
    """


def formatear_historial(historial: list, texto_borrador: str, texto_usuario: str) -> list:
    mensajes = []

    for msg in historial[:-1]:
        if msg["rol"] == "usuario":
            mensajes.append(("human", msg["texto"]))
        elif msg["rol"] == "ia":
            mensajes.append(("ai", msg["texto"]))

    mensaje_final = f"""CONTEXTO ACTUAL DEL EDITOR:
    {texto_borrador if texto_borrador.strip() else "El editor está vacío."}
    
    PREGUNTA O COMENTARIO DEL ESTUDIANTE:
    {texto_usuario}"""

    mensajes.append(("human", mensaje_final))
    return mensajes


def obtener_llm(modelo_solicitado: str, llm_cache: dict) -> Ollama:
    modelo = modelo_solicitado if modelo_solicitado in MODELOS_DISPONIBLES else MODELO_DEFAULT

    if modelo != modelo_solicitado:
        print(f"⚠️  Modelo '{modelo_solicitado}' no reconocido. Usando default: {MODELO_DEFAULT}")

    if modelo not in llm_cache:
        print(f"🔄 Primera solicitud para '{modelo}'. Creando cliente...")
        llm_cache[modelo] = Ollama(model=modelo)

    return llm_cache[modelo]


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Iniciando servidor IARS...")
    app.state.prompts = cargar_yamls()
    print(f"✅ Prompts cargados: {list(app.state.prompts.keys())}")
    app.state.llm_cache = {MODELO_DEFAULT: Ollama(model=MODELO_DEFAULT)}
    print(f"✅ Modelo default listo: {MODELO_DEFAULT}")
    yield
    print("🛑 Servidor IARS apagándose.")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/modelos")
def modelos():
    return {"modelos": MODELOS_DISPONIBLES}


@app.post("/api/chat")
def chat(body: Mensaje, request: Request):
    prompts = request.app.state.prompts
    llm_cache = request.app.state.llm_cache

    llm = obtener_llm(body.modelo, llm_cache)

    prompt_sistema = construir_prompt_sistema(body.etapa_actual, prompts)
    mensajes = [("system", prompt_sistema)] + formatear_historial(
        body.historial, body.texto_borrador, body.texto
    )

    print(f"🚀 MODELO: {body.modelo} | ETAPA: {body.etapa_actual}")
    print("\n--- PROMPT FINAL ---")
    for rol, contenido in mensajes:
        print(f"[{rol.upper()}]: {contenido}")
    print("--------------------\n")

    prompt_template = ChatPromptTemplate.from_messages(mensajes)
    cadena = prompt_template | llm
    respuesta = cadena.invoke({})

    return {"respuesta": respuesta}