from supabase import create_client, Client
import os
from jose import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# --- CONFIGURACIÓN DE SEGURIDAD ---
SECRET_KEY = os.environ.get("SECRET_KEY", "super-secret-key-para-desarrollo")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 horas

def crear_token_acceso(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def registrar_cobro_alquiler(inquilino_id: int, mes: str, anio: int, monto_recibido: float):
    # 1. Primero obtenemos el monto pactado del maestro de inquilinos
    inquilino = supabase.table("inquilinos").select("monto_alquiler").eq("id", inquilino_id).single().execute()
    monto_pactado = float(inquilino.data['monto_alquiler'])

    # 2. Registramos el pago de alquiler (podría ser parcial)
    # Aquí es donde se ve la diferencia vs el pactado
    alquiler = supabase.table("pagos_alquiler").upsert({
        "inquilino_id": inquilino_id,
        "mes_periodo": mes,
        "anio_periodo": anio,
        "monto_pagado": monto_recibido,
        "pagado": monto_recibido >= monto_pactado, # Solo es "True" si pagó todo
        "fecha_pago": "now()"
    }).execute()

    # 3. El tributo se calcula SIEMPRE sobre el monto pactado (lo legal ante SUNAT)
    monto_tributo = monto_pactado * 0.05

    tributo = supabase.table("pagos_tributos").upsert({
        "inquilino_id": inquilino_id,
        "mes_periodo": mes,
        "anio_periodo": anio,
        "monto_tributo": monto_tributo,
        "estado_pago": "pendiente"
    }).execute()

    return {
        "status": "procesado",
        "monto_pactado": monto_pactado,
        "monto_recibido": monto_recibido,
        "deuda_alquiler": monto_pactado - monto_recibido
    }

def obtener_dashboard_madre(mes: str, anio: int):
    """
    Trae la lista de TODOS los inquilinos y filtra sus estados de pago por mes/anio en Python.
    """
    # 1. Traemos TODOS los inquilinos con sus relaciones (sin filtrar en la query para evitar inner joinimplícito)
    query_inquilinos = supabase.table("inquilinos").select(
        "nombre, dni, departamento, monto_alquiler, "
        "pagos_alquiler(mes_periodo, anio_periodo, pagado, monto_pagado), "
        "pagos_tributos(mes_periodo, anio_periodo, estado_pago, monto_tributo)"
    ).execute()
    
    inquilinos_data = query_inquilinos.data
    
    # 2. Filtrado manual en Python para el mes y año solicitados
    for inq in inquilinos_data:
        # Filtrar pagos_alquiler
        if "pagos_alquiler" in inq and inq["pagos_alquiler"]:
            inq["pagos_alquiler"] = [p for p in inq["pagos_alquiler"] 
                                   if p["mes_periodo"] == mes and p["anio_periodo"] == anio]
        
        # Filtrar pagos_tributos
        if "pagos_tributos" in inq and inq["pagos_tributos"]:
            inq["pagos_tributos"] = [t for t in inq["pagos_tributos"] 
                                   if t["mes_periodo"] == mes and t["anio_periodo"] == anio]

    # 3. Obtener los datos del propietario (asumimos id=1 para Madre)
    query_propietario = supabase.table("propietarios").select("*").eq("id", 1).single().execute()
    propietario_data = query_propietario.data
    
    # 4. Obtener cronograma para el año y el dígito del propietario
    query_cronograma = supabase.table("cronograma_sunat").select("*") \
        .eq("anio_periodo", anio) \
        .eq("ultimo_digito", propietario_data.get("ultimo_digito")) \
        .execute()
    
    return {
        "inquilinos": inquilinos_data,
        "propietario": propietario_data,
        "cronograma": query_cronograma.data
    }

def verificar_login(ruc: str, password_ingresada: str):
    # 1. Buscamos al propietario por RUC para obtener sus datos (incluida la contraseña)
    query = supabase.table("propietarios") \
        .select("nombre", "ruc_dni", "password") \
        .eq("ruc_dni", ruc) \
        .execute()
    
    if query.data and len(query.data) > 0:
        usuario = query.data[0]
        
        # 2. Validación de la contraseña contra la base de datos
        if usuario.get("password") != password_ingresada:
            return {"status": "error", "message": "Credenciales incorrectas"}

        # 3. Si es correcta, generamos el Token de Sesión
        token = crear_token_acceso({"sub": usuario["ruc_dni"], "nombre": usuario["nombre"]})
        return {
            "status": "success", 
            "user": usuario["nombre"],
            "token": token
        }
    else:
        return {"status": "error", "message": "Propietario no encontrado"}