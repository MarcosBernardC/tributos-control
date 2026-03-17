# 🏠 Tributos Control

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Koyeb](https://img.shields.io/badge/Koyeb-131313?style=for-the-badge&logo=koyeb&logoColor=white)](https://www.koyeb.com/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

**Tributos Control** es un CRM financiero diseñado para la gestión eficiente de arrendamientos e impuestos de primera categoría. Este proyecto nació como una solución personalizada para optimizar la cobranza de alquileres y el control tributario de una cartera de inmuebles familiar.

## 🚀 Características Principales

- **Dashboard Financiero:** Visualización clara de ingresos estimados y obligaciones tributarias (5% SUNAT).
- **Gestión de Inquilinos:** Control de estados de pago (Pendiente/Pagado) en tiempo real.
- **Modo Privacidad:** Enmascaramiento dinámico de datos sensibles (DNI/RUC) para demostraciones o uso en público.
- **Arquitectura Moderna:** Backend robusto en FastAPI y persistencia de datos en la nube con Supabase.
- **Diseño Responsive:** Interfaz optimizada para escritorio y dispositivos móviles.

## 🛠️ Stack Tecnológico

- **Frontend:** HTML5, CSS3 (Modern Grid/Sticky Layout), JavaScript (Vanilla JS con Patrón Adaptador).
- **Backend:** Python 3.14+ con FastAPI.
- **Base de Datos:** PostgreSQL (vía Supabase).
- **Despliegue:** Koyeb (PaaS).

## 📂 Estructura del Proyecto

```text
.
├── backend/          # API REST y Lógica de Negocio
├── data/database/    # Scripts de inicialización SQL
├── docs/             # Frontend (GitHub Pages Ready)
├── Procfile          # Configuración de despliegue para Koyeb
└── requirements.txt  # Dependencias del sistema
```

## 🔐 Seguridad y Privacidad

El sistema implementa un flujo de autenticación contra base de datos y un **"Modo Privado"** que permite ocultar documentos de identidad con un solo clic, garantizando que la información sensible solo sea visible cuando el administrador lo requiera.

## 📜 Licencia

Este proyecto está bajo la licencia **GNU General Public License v3.0**. Eres libre de usar, modificar y distribuir el software, siempre que las obras derivadas mantengan la misma licencia bajo los mismos términos.

---

_Desarrollado con ❤️ para optimizar la gestión de alquileres familiar._
