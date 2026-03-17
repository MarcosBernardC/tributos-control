from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Importamos las funciones que ya creamos en logic.py
from logic import registrar_cobro_alquiler, obtener_dashboard_madre, verificar_login, SECRET_KEY, ALGORITHM

load_dotenv()

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def validar_token(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token de acceso",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        ruc: str = payload.get("sub")
        if ruc is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return payload

# --- CONFIGURACIÓN DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "https://marcosbernardc.github.io" # <--- ¡ESTA LÍNEA ES VITAL!
    ],
    allow_credentials=True,
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
def leer_dashboard(mes: str, anio: int, token_data: dict = Depends(validar_token)):
    # Llamamos a la lógica que ya sabe hablar con Supabase
    datos = obtener_dashboard_madre(mes, anio)
    return {"data": datos}

# Endpoint para registrar un pago (Cobrar renta y calcular tributo)
@app.post("/cobrar")
def cobrar(inquilino_id: int, mes: str, anio: int, monto: float, token_data: dict = Depends(validar_token)):
    # Esta función en logic.py hace toda la magia
    resultado = registrar_cobro_alquiler(inquilino_id, mes, anio, monto)
    return resultado

class LoginRequest(BaseModel):
    ruc: str
    password: str

@app.post("/login")
def login(req: LoginRequest):
    return verificar_login(req.ruc, req.password)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)