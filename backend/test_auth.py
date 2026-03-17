import requests
import sys

BASE_URL = "http://localhost:8000"

def test_auth():
    print("--- Probando Seguridad de Backend ---")
    
    # 1. Intentar acceder al dashboard sin token (Debe fallar 401)
    print("\n1. Acceso sin token a /dashboard/marzo/2024...")
    try:
        r = requests.get(f"{BASE_URL}/dashboard/marzo/2024")
        print(f"Status: {r.status_code}")
        if r.status_code == 401:
            print("CORRECTO: Acceso denegado (401)")
        else:
            print(f"ERROR: Se esperaba 401, se obtuvo {r.status_code}")
    except Exception as e:
        print(f"Error conectando (¿Está el servidor corriendo?): {e}")
        return

    # 2. Login con contraseña incorrecta
    print("\n2. Login con contraseña incorrectA...")
    payload = {"ruc": "12345678901", "password": "wrong"}
    r = requests.post(f"{BASE_URL}/login", json=payload)
    print(f"Status: {r.status_code}, Resp: {r.json()}")
    if r.json().get("status") == "error":
        print("CORRECTO: Login fallido")
    else:
        print("ERROR: El login debió fallar")

    # 3. Login con contraseña correcta (admin123 por default)
    # Nota: El RUC debe existir en Supabase para que funcione 100%
    print("\n3. Login con contraseña correctA (admin123)...")
    payload = {"ruc": "20100010001", "password": "admin123"} # Usando un RUC de ejemplo
    r = requests.post(f"{BASE_URL}/login", json=payload)
    print(f"Status: {r.status_code}, Resp: {r.json()}")
    
    if r.status_code == 200 and "token" in r.json():
        token = r.json()["token"]
        print("CORRECTO: Token obtenido")
        
        # 4. Acceso con token válido
        print("\n4. Acceso con token a /dashboard/marzo/2024...")
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(f"{BASE_URL}/dashboard/marzo/2024", headers=headers)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print("CORRECTO: Acceso concedido")
        else:
            print(f"ERROR: Se esperaba 200, se obtuvo {r.status_code}")
            print(f"Detalle: {r.text}")
    else:
        print("ERROR: No se obtuvo token. Asegúrese que el RUC exista en Supabase.")

if __name__ == "__main__":
    test_auth()
