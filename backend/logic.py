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

def registrar_cobro_alquiler(inquilino_id: int, mes: str, anio: int, monto_recibido: float, ruc_usuario: str):
    # 0. Obtenemos al propietario por RUC para validar propiedad y obtener su tasa
    prop_query = supabase.table("propietarios").select("id, tasa_arrendamiento").eq("ruc_dni", ruc_usuario).single().execute()
    propietario = prop_query.data
    prop_id = propietario["id"]
    tasa = float(propietario.get("tasa_arrendamiento", 0.05))

    # 1. Obtenemos el monto pactado y validamos que el inquilino pertenezca al propietario
    inquilino_query = supabase.table("inquilinos") \
        .select("monto_alquiler, propietario_id") \
        .eq("id", inquilino_id) \
        .single().execute()
    
    inquilino = inquilino_query.data
    if inquilino["propietario_id"] != prop_id:
        return {"status": "error", "message": "No tiene permisos sobre este inquilino"}
    
    monto_pactado = float(inquilino['monto_alquiler'])

    # 2. Registramos el pago de alquiler
    supabase.table("pagos_alquiler").upsert({
        "inquilino_id": inquilino_id,
        "mes_periodo": mes,
        "anio_periodo": anio,
        "monto_pagado": monto_recibido,
        "pagado": monto_recibido >= monto_pactado,
        "fecha_pago": "now()"
    }).execute()

    # 3. El tributo se calcula sobre el pactado usando la tasa dinámica del propietario
    monto_tributo = monto_pactado * tasa

    supabase.table("pagos_tributos").upsert({
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
        "deuda_alquiler": monto_pactado - monto_recibido,
        "tasa_aplicada": tasa
    }

def obtener_dashboard_madre(mes: str, anio: int, ruc_usuario: str):
    """
    Trae la lista de inquilinos filtrada por el propietario autenticado.
    """
    # 1. Obtenemos datos del propietario por su RUC
    prop_query = supabase.table("propietarios").select("*").eq("ruc_dni", ruc_usuario).single().execute()
    propietario_data = prop_query.data
    prop_id = propietario_data["id"]

    # 2. Traemos SOLO los inquilinos de este propietario
    query_inquilinos = supabase.table("inquilinos").select(
        "nombre, dni, departamento, monto_alquiler, "
        "pagos_alquiler(mes_periodo, anio_periodo, pagado, monto_pagado), "
        "pagos_tributos(mes_periodo, anio_periodo, estado_pago, monto_tributo)"
    ).eq("propietario_id", prop_id).execute()
    
    inquilinos_data = query_inquilinos.data
    
    # 3. Filtrado manual de pagos en Python
    for inq in inquilinos_data:
        if "pagos_alquiler" in inq and inq["pagos_alquiler"]:
            inq["pagos_alquiler"] = [p for p in inq["pagos_alquiler"] 
                                   if p["mes_periodo"] == mes and p["anio_periodo"] == anio]
        
        if "pagos_tributos" in inq and inq["pagos_tributos"]:
            inq["pagos_tributos"] = [t for t in inq["pagos_tributos"] 
                                   if t["mes_periodo"] == mes and t["anio_periodo"] == anio]

    # 4. Obtener cronograma para el dígito específico del propietario
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