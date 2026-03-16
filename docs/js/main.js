document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const refreshBtn = document.getElementById('refresh-btn');
    
    // Configuración de contraseña quemada
    const SECRET_PASSWORD = "1234";

    // Eventos
    refreshBtn.addEventListener('click', loadData);

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userInput = passwordInput.value;
        
        if (userInput === SECRET_PASSWORD) {
            // Login exitoso
            loginContainer.classList.add('d-none');
            dashboardContainer.classList.remove('d-none');
            showToast('Acceso concedido', 'success');
            
            // Cargar datos reales
            loadData();
        } else {
            // Error
            showToast('Contraseña incorrecta', 'error');
            passwordInput.value = '';
            passwordInput.focus();
        }
    });

    // Initial load happens ONLY after successful login.
});

async function loadData() {
    showToast('Sincronizando con el servidor...', 'info');
    
    // Periodo predeterminado de consulta sugerido por el contexto inicial
    const mesConsulta = "03";
    const anioConsulta = 2026;
    
    try {
        const response = await fetch(`http://127.0.0.1:8000/dashboard/${mesConsulta}/${anioConsulta}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const apiResponse = await response.json();
        const baseDatosInquilinos = apiResponse.data;

        // Adaptamos la data nueva del backend al formato que necesita nuestras funciones render
        const inquilinosAdaptados = baseDatosInquilinos.map((inq, idx) => {
            // Verificar estado de pago en los arrays anidados (pagos_alquiler)
            let estadoDePago = "pendiente";
            if (inq.pagos_alquiler && inq.pagos_alquiler.length > 0) {
                // Si existe al menos un pago registrado que indique pagado == true
                const pagoRealizado = inq.pagos_alquiler.some(p => p.pagado);
                if (pagoRealizado) estadoDePago = "pagado";
            }
            
            return {
                "id": idx + 1,
                "nombre": inq.nombre,
                "dni": "•••• Oculto", // El API ya no envía el DNI, ocultamos por seguridad
                "departamento": inq.departamento,
                "monto_alquiler": inq.monto_alquiler,
                "mes_a_pagar": mesConsulta,
                "estado_pago": estadoDePago
            };
        });
        
        // Consolidar la data
        const datosConBackend = {
          "propietario": {
            "nombre": "Madre",
            "ruc_dni": "XXXXXXXXXX1",
            "ultimo_digito": 1
          },
          "cronograma_2026": {
            "03": "2026-04-20", "04": "2026-05-19", "05": "2026-06-18", "06": "2026-07-16",
            "07": "2026-08-19", "08": "2026-09-16", "09": "2026-10-19", "10": "2026-11-17",
            "11": "2026-12-18", "12": "2027-01-19"
          },
          "inquilinos": inquilinosAdaptados,
          "configuracion": {
            "tasa_arrendamiento": 0.05
          }
        };

        renderDashboard(datosConBackend);
        showToast('Datos sincronizados con éxito', 'success');
    } catch (error) {
        console.warn("No se pudo hacer fetch al backend. Servidor apagado o CORS error. Usando fallback.", error);
        
        // Fallback data simulado si el backend de Python no se está ejecutando
        const fallbackData = {
          "propietario": {
            "nombre": "Madre",
            "ruc_dni": "XXXXXXXXXX1",
            "ultimo_digito": 1
          },
          "cronograma_2026": {
            "03": "2026-04-20", "04": "2026-05-19", "05": "2026-06-18", "06": "2026-07-16",
            "07": "2026-08-19", "08": "2026-09-16", "09": "2026-10-19", "10": "2026-11-17",
            "11": "2026-12-18", "12": "2027-01-19"
          },
          "inquilinos": [
            { "id": 1, "nombre": "Inquilino Falso 1", "dni": "---", "departamento": "101", "monto_alquiler": 1200.00, "mes_a_pagar": "03", "estado_pago": "pendiente" },
            { "id": 2, "nombre": "Inquilino Falso 2", "dni": "---", "departamento": "102", "monto_alquiler": 700.00, "mes_a_pagar": "03", "estado_pago": "pagado" }
          ],
          "configuracion": {
            "tasa_arrendamiento": 0.05
          }
        };
        renderDashboard(fallbackData);
        showToast('Mostrando datos base (Servidor API inactivo)', 'error');
    }
}

function renderDashboard(data) {
    renderPropietario(data.propietario);
    renderConfiguracion(data.configuracion);
    renderCronograma(data.cronograma_2026);
    renderResumen(data);
    renderInquilinos(data.inquilinos, data.configuracion.tasa_arrendamiento);
}

function renderPropietario(propietario) {
    const container = document.getElementById('propietario-info');
    container.innerHTML = `
        <div class="data-group">
            <div class="data-label">Nombre / Razón Social</div>
            <div class="data-value">${propietario.nombre}</div>
        </div>
        <div class="data-group">
            <div class="data-label">RUC / DNI</div>
            <div class="data-value">${propietario.ruc_dni}</div>
        </div>
        <div class="data-group">
            <div class="data-label">Último dígito para cronograma</div>
            <div class="data-value"><span class="badge pendiente">${propietario.ultimo_digito}</span></div>
        </div>
    `;
}

function renderConfiguracion(config) {
    const container = document.getElementById('config-info');
    const porcentaje = (config.tasa_arrendamiento * 100).toFixed(1) + '%';
    container.innerHTML = `
        <div class="data-group">
            <div class="data-label">Tasa de Impuesto (5%)</div>
            <div class="highlight-value">${porcentaje}</div>
            <div class="subtitle">Categoría: Primera Categoría - Alquileres</div>
        </div>
    `;
}

function renderResumen(data) {
    const container = document.getElementById('resumen-info');
    
    // Calcular totales
    let totalIngresos = 0;
    let totalImpuestos = 0;
    let pendientes = 0;
    
    data.inquilinos.forEach(inq => {
        totalIngresos += inq.monto_alquiler;
        totalImpuestos += (inq.monto_alquiler * data.configuracion.tasa_arrendamiento);
        if (inq.estado_pago === 'pendiente') pendientes++;
    });

    const formatoMoneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format;

    container.innerHTML = `
        <div class="data-group">
            <div class="data-label">Alquileres Totales Estimados</div>
            <div class="data-value">${formatoMoneda(totalIngresos)}</div>
        </div>
        <div class="data-group">
            <div class="data-label">Impuesto a Declarar (Total)</div>
            <div class="highlight-value">${formatoMoneda(totalImpuestos)}</div>
        </div>
        <div class="data-group">
            <div class="data-label">Estado de Cobranza</div>
            <div class="data-value">
                <span class="${pendientes > 0 ? 'vencimiento-proximo' : 'badge pagado'}">
                    ${pendientes === 0 ? 'Todo pagado' : `${pendientes} pago(s) pendiente(s)`}
                </span>
            </div>
        </div>
    `;
}

function renderCronograma(cronograma) {
    const tbody = document.querySelector('#cronograma-table tbody');
    tbody.innerHTML = '';

    const mesesNombres = {
        "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
        "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
        "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
    };

    const hoy = new Date();
    // Limpiar 'hoy' a solo fecha para comparar bien
    hoy.setHours(0,0,0,0);

    // Sort cronograma chronologically
    const entradasOrdenadas = Object.entries(cronograma).sort((a, b) => {
        const fechaA = new Date(a[1] + "T00:00:00-05:00");
        const fechaB = new Date(b[1] + "T00:00:00-05:00");
        return fechaA - fechaB;
    });

    for (const [mes, fechaStr] of entradasOrdenadas) {
        const fechaVencimiento = new Date(fechaStr + "T00:00:00-05:00");
        
        // Filter: Optional, request didn't explicitly say to hide past dates, just "order them from march 2026 to december 2026".
        // Based on JSON, all records start from march. So ordering is enough.
        
        let estadoClass = '';
        let estadoTexto = '';
        let filaClass = '';

        if (fechaVencimiento < hoy) {
            estadoTexto = 'Vencido';
            filaClass = 'vencimiento-pasado';
        } else {
            const diffTime = Math.abs(fechaVencimiento - hoy);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 15) {
                estadoClass = 'vencimiento-proximo';
                estadoTexto = 'Próximo a Vencer';
            } else {
                estadoTexto = 'Vigente';
            }
        }

        // Formatear fecha
        const fechaFormato = new Intl.DateTimeFormat('es-PE', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
        }).format(fechaVencimiento);

        const tr = document.createElement('tr');
        if (filaClass) tr.classList.add(filaClass);
        
        tr.innerHTML = `
            <td>${mesesNombres[mes]}</td>
            <td class="${estadoClass}">${fechaFormato}</td>
            <td>${estadoTexto}</td>
        `;
        tbody.appendChild(tr);
    }
}

function renderInquilinos(inquilinos, tasa) {
    const grid = document.getElementById('inquilinos-grid');
    grid.innerHTML = '';
    
    const formatoMoneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format;
    const mesesNombres = {
        "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
        "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
        "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic"
    };

    inquilinos.forEach(inq => {
        const impuesto = inq.monto_alquiler * tasa;
        
        const card = document.createElement('div');
        card.className = `inquilino-card status-${inq.estado_pago}`;
        
        card.innerHTML = `
            <div class="inquilino-header">
                <div>
                    <div class="inquilino-name">${inq.nombre}</div>
                    <div class="inquilino-depto">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        Dpto: ${inq.departamento}
                    </div>
                </div>
                <span class="badge ${inq.estado_pago}">${inq.estado_pago}</span>
            </div>
            
            <div class="inquilino-details">
                <div class="detail-row">
                    <span class="label">DNI:</span>
                    <span class="value">${inq.dni}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Mes de Cargo:</span>
                    <span class="value">${mesesNombres[inq.mes_a_pagar]}</span>
                </div>
                <div class="detail-row mt-2">
                    <span class="label">Monto Alquiler:</span>
                    <span class="value monto">${formatoMoneda(inq.monto_alquiler)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Impuesto (5%):</span>
                    <span class="value impuesto">${formatoMoneda(impuesto)}</span>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    
    if (type === 'error') {
        toast.classList.add('error');
    } else {
        toast.classList.remove('error');
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
