import random
import string
import qrcode
from io import BytesIO
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GestorConexiones:
    def __init__(self):
        self.conexiones_activas: list[WebSocket] = []

    async def conectar(self, websocket: WebSocket):
        await websocket.accept()
        self.conexiones_activas.append(websocket)

    def desconectar(self, websocket: WebSocket):
        if websocket in self.conexiones_activas:
            self.conexiones_activas.remove(websocket)

    async def transmitir(self, mensaje: dict):
        for conexion in self.conexiones_activas:
            await conexion.send_json(mensaje)

gestor = GestorConexiones()

bolas_sacadas = []
pases_validos = {}
modo_juego = "quina" 

def generar_carton():
    rangos = {'B': range(1, 16), 'I': range(16, 31), 'N': range(31, 46), 'G': range(46, 61), 'O': range(61, 76)}
    carton = {letra: random.sample(rango, 5) for letra, rango in rangos.items()}
    carton['N'][2] = "LIBRE"
    return carton

@app.get("/cambiar-modo/{nuevo_modo}")
async def cambiar_modo(nuevo_modo: str):
    global modo_juego
    modo_juego = nuevo_modo
    await gestor.transmitir({"tipo": "cambio_modo", "modo": modo_juego})
    return {"mensaje": "Modo actualizado", "modo": modo_juego}

@app.get("/generar-qr")
def generar_qr():
    token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    pases_validos[token] = generar_carton()
    # NUEVA RUTA: Apunta a tu página web real de GitHub Pages
    url_acceso = f"https://daltonme8888.github.io/bingo-servidor/index.html?token={token}"
    img = qrcode.make(url_acceso)
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    print(f"NUEVO PASE GENERADO. Código manual: {token}")
    return StreamingResponse(buf, media_type="image/png")

@app.get("/carton/{token}")
def obtener_carton_seguro(token: str):
    token = token.upper() 
    if token not in pases_validos:
        raise HTTPException(status_code=403, detail="Pase inválido.")
    return {"mensaje": "Éxito", "carton": pases_validos[token]}

@app.websocket("/ws")
async def endpoint_websocket(websocket: WebSocket):
    await gestor.conectar(websocket)
    await websocket.send_json({"tipo": "historial", "bolas": bolas_sacadas, "modo": modo_juego})
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        gestor.desconectar(websocket)

@app.get("/sacar-bola/{letra_numero}")
async def sacar_bola(letra_numero: str):
    if letra_numero not in bolas_sacadas:
        bolas_sacadas.append(letra_numero)
        await gestor.transmitir({"tipo": "nueva_bola", "bola": letra_numero})
    return {"mensaje": "Enviada"}

@app.get("/deshacer-bola/{letra_numero}")
async def deshacer_bola(letra_numero: str):
    if letra_numero in bolas_sacadas:
        bolas_sacadas.remove(letra_numero)
        await gestor.transmitir({"tipo": "deshacer_bola", "bola": letra_numero})
    return {"mensaje": "Bola deshecha"}

@app.get("/crear-pase")
def crear_pase():
    token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    pases_validos[token] = generar_carton()
    return {"mensaje": "Éxito", "token": token}

@app.get("/ver-qr/{token}")
def ver_qr(token: str):
    # NUEVA RUTA: Apunta a tu página web real de GitHub Pages
    url_acceso = f"https://daltonme8888.github.io/bingo-servidor/index.html?token={token}"
    img = qrcode.make(url_acceso)
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

@app.get("/cantar-bingo")
async def cantar_bingo():
    await gestor.transmitir({"tipo": "bingo"})
    return {"mensaje": "Alguien ganó"}

@app.get("/reset")
async def reset_juego():
    bolas_sacadas.clear()
    await gestor.transmitir({"tipo": "reset"})
    return {"mensaje": "Juego reiniciado (bolas limpias)"}

@app.get("/estado")
def estado_juego():
    return {"bolas": bolas_sacadas, "modo": modo_juego}

@app.get("/pases")
def obtener_pases():
    return {"pases": list(pases_validos.keys())}

@app.get("/borrar-pases")
async def borrar_pases():
    pases_validos.clear() 
    await gestor.transmitir({"tipo": "expulsar"})
    return {"mensaje": "Todos los pases fueron eliminados"}