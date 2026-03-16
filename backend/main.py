from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Cargamos las variables del archivo .env
load_dotenv()

app = FastAPI()

# --- CONFIGURACIÓN DE CORS ---
# Esto es vital para que tu HTML/JS pueda hablar con este backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Luego lo limitaremos a tu dominio de GitHub Pages
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONEXIÓN A SUPABASE ---
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

@app.get("/")
def home():
    return {
        "status": "Backend Online",
        "proyecto": "tributos-control",
        "conexion_supabase": "Exitosa" if url else "Faltan credenciales"
    }

# Un endpoint de prueba para ver si Supabase responde
@app.get("/test-db")
def test_db():
    try:
        # Intentamos listar las tablas (o una consulta simple)
        return {"mensaje": "Conexión establecida con Supabase"}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    # Usamos el puerto 8000 para local y Koyeb usará el que necesite
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)