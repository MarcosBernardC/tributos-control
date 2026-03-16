from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Importamos las funciones que ya creamos en logic.py
from logic import registrar_cobro_alquiler, obtener_dashboard_madre

load_dotenv()

app = FastAPI()

# --- CONFIGURACIÓN DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- RUTAS ---

@app.get("/")
def home():
    return {
        "status": "Backend Online",
        "proyecto": "tributos-control",
        "objetivo": "Gestión de alquileres y tributos para mamá"
    }

# Endpoint para ver el resumen del mes
@app.get("/dashboard/{mes}/{anio}")
def leer_dashboard(mes: str, anio: int):
    # Llamamos a la lógica que ya sabe hablar con Supabase
    datos = obtener_dashboard_madre(mes, anio)
    return {"data": datos}

# Endpoint para registrar un pago (Cobrar renta y calcular tributo)
@app.post("/cobrar")
def cobrar(inquilino_id: int, mes: str, anio: int, monto: float):
    # Esta función en logic.py hace toda la magia
    resultado = registrar_cobro_alquiler(inquilino_id, mes, anio, monto)
    return resultado

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)