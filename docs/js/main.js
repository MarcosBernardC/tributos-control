document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const refreshBtn = document.getElementById('refresh-btn');
    const privacyBtn = document.getElementById('privacy-btn');
    const privacyIcon = document.getElementById('privacy-icon');
    
    // Configuración de estado global
    const SECRET_PASSWORD = "1234";
    window.isPrivateMode = true; // Por defecto empezamos en modo privado
    window.currentData = null; // Guardará la info actual para redibujar sin refetch

    // Eventos
    refreshBtn.addEventListener('click', loadData);
    
    privacyBtn.addEventListener('click', () => {
        window.isPrivateMode = !window.isPrivateMode;
        
        // Actualizar el icono y texto del botón
        if (window.isPrivateMode) {
            privacyIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
            privacyBtn.querySelector('span').textContent = 'Modo Privado';
            showToast('Modo de Privacidad: Activado', 'info');
        } else {
            privacyIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
            privacyBtn.querySelector('span').textContent = 'Modo Público';
            showToast('Modo de Privacidad: Desactivado', 'info');
        }
        
        // Redibujar la interfaz con los datos cacheados
        if (window.currentData) {
            renderDashboard(window.currentData);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userInput = passwordInput.value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.textContent = "Verificando...";
            submitBtn.disabled = true;
            
            // Enviamos el RUC correcto pre-configurado para que la madre no tenga que memorizarlo
            const rucPropietaria = "12345678901"; 
            
            const response = await fetch('http://127.0.0.1:8000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ruc: rucPropietaria, password: userInput })
            });

            if (!response.ok) {
                throw new Error("Error conectando con el servidor");
            }

            const data = await response.json();

            if (data.status === 'success') {
                // Login exitoso
                loginContainer.style.opacity = '0';
                setTimeout(() => {
                    loginContainer.classList.add('d-none');
                    dashboardContainer.classList.remove('d-none');
                    // Forzar redibujado
                    dashboardContainer.getBoundingClientRect();
                    document.body.style.backgroundColor = 'var(--background)';
                    dashboardContainer.style.opacity = '1';
                    
                    showToast(`¡Bienvenida ${data.user}!`, 'success');
                    
                    // Cargar datos reales
                    loadData();
                }, 300);
            } else {
                // Error
                showToast(data.message || 'Contraseña incorrecta', 'error');
                
                // Efecto visual de error
                passwordInput.style.borderColor = 'var(--danger)';
                setTimeout(() => {
                    passwordInput.style.borderColor = '';
                }, 1000);
                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (error) {
            console.error("Error en login:", error);
            showToast("No se pudo conectar al servidor de autenticación.", "error");
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
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
        // Ahora el backend nos devuelve inquilinos, propietario y cronograma
        const baseDatosInquilinos = apiResponse.data.inquilinos || [];
        const baseDatosPropietario = apiResponse.data.propietario || null;
        const baseDatosCronograma = apiResponse.data.cronograma || [];

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
                // Si el backend envía el dni lo leemos, sino usamos una raya
                "dni": inq.dni ? inq.dni : "---",
                "departamento": inq.departamento,
                "monto_alquiler": inq.monto_alquiler,
                "mes_a_pagar": mesConsulta,
                "estado_pago": estadoDePago
            };
        });
        
        // Adaptar cronograma a objeto clave-valor (mes: fecha)
        const cronogramaAdaptado = {};
        if (baseDatosCronograma.length > 0) {
            baseDatosCronograma.forEach(cro => {
                cronogramaAdaptado[cro.mes_periodo] = cro.fecha_vencimiento;
            });
        } else {
            // Fallback parcial de marzo si la BD está vacía (evita romper UI)
            cronogramaAdaptado["03"] = "2026-04-20";
        }

        // Consolidar la data
        const datosConBackend = {
          "propietario": baseDatosPropietario ? {
            "nombre": baseDatosPropietario.nombre,
            "ruc_dni": baseDatosPropietario.ruc_dni, 
            "ultimo_digito": baseDatosPropietario.ultimo_digito
          } : {
            "nombre": "Madre",
            "ruc_dni": "10012345671", // Fallback interno si algo falla
            "ultimo_digito": 1
          },
          "cronograma_2026": cronogramaAdaptado,
          "inquilinos": inquilinosAdaptados,
          "configuracion": {
            "tasa_arrendamiento": baseDatosPropietario ? (baseDatosPropietario.tasa_arrendamiento || 0.05) : 0.05
          }
        };

        window.currentData = datosConBackend;
        renderDashboard(datosConBackend);
        showToast('Datos sincronizados con éxito', 'success');
    } catch (error) {
        console.warn("No se pudo hacer fetch al backend. Servidor apagado o CORS error. Usando fallback.", error);
        
        // Fallback data simulado si el backend de Python no se está ejecutando
        const fallbackData = {
          "propietario": {
            "nombre": "Madre",
            "ruc_dni": "10012345671",
            "ultimo_digito": 1
          },
          "cronograma_2026": {
            "03": "2026-04-20", "04": "2026-05-19", "05": "2026-06-18", "06": "2026-07-16",
            "07": "2026-08-19", "08": "2026-09-16", "09": "2026-10-19", "10": "2026-11-17",
            "11": "2026-12-18", "12": "2027-01-19"
          },
          "inquilinos": [
            { "id": 1, "nombre": "Inquilino Falso 1", "dni": "72635411", "departamento": "101", "monto_alquiler": 1200.00, "mes_a_pagar": "03", "estado_pago": "pendiente" },
            { "id": 2, "nombre": "Inquilino Falso 2", "dni": "45129833", "departamento": "102", "monto_alquiler": 700.00, "mes_a_pagar": "03", "estado_pago": "pagado" }
          ],
          "configuracion": {
            "tasa_arrendamiento": 0.05
          }
        };
        
        window.currentData = fallbackData;
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
    
    // Ocultar RUC si la privacidad está activada
    let rucVisible = propietario.ruc_dni;
    if (window.isPrivateMode && rucVisible && rucVisible.length > 1) {
       // Mask all characters except the last one dynamically for any length of RUC/DNI
       rucVisible = '•'.repeat(rucVisible.length - 1) + rucVisible.substring(rucVisible.length - 1);
    }
    
    container.innerHTML = `
        <div class="data-group mb-2">
            <div class="data-label text-sm">Razón Social</div>
            <div class="data-value">${propietario.nombre}</div>
        </div>
        <div class="data-group mb-0">
            <div class="data-label text-sm">Identificación (RUC)</div>
            <div class="data-value font-mono bg-light-gray px-2 py-1 inline-block rounded">${rucVisible}</div>
        </div>
    `;
}

function renderConfiguracion(config) {
    const container = document.getElementById('config-info');
    const porcentaje = (config.tasa_arrendamiento * 100).toFixed(1) + '%';
    container.innerHTML = `
        <div class="data-group mb-2">
            <div class="data-label text-sm">Tasa de Impuesto (1era Cat.)</div>
            <div class="highlight-value text-xl">${porcentaje}</div>
        </div>
        <div class="data-group mb-0">
            <div class="data-label text-sm">Estado General</div>
            <span class="badge pagado text-xs">Vigente</span>
        </div>
    `;
}

function renderResumen(data) {
    const container = document.getElementById('kpi-container');
    
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

    // Generar KPI cards top row
    container.innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon bg-green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div class="kpi-info">
                <h3>Ingresos Estimados</h3>
                <div class="kpi-value text-green-600">${formatoMoneda(totalIngresos)}</div>
            </div>
        </div>

        <div class="kpi-card">
            <div class="kpi-icon bg-blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div class="kpi-info">
                <h3>Estado de Cobranza</h3>
                <div class="kpi-value mt-1">
                    <span class="${pendientes > 0 ? 'badge pendiente' : 'badge pagado'}">
                        ${pendientes === 0 ? 'Al día 100%' : `${pendientes} pendiente(s)`}
                    </span>
                </div>
            </div>
        </div>

        <div class="kpi-card">
            <div class="kpi-icon bg-purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <div class="kpi-info">
                <h3>Obligación a Declarar</h3>
                <div class="kpi-value">${formatoMoneda(totalImpuestos)}</div>
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
                    <span class="value">${window.isPrivateMode ? '•••• Oculto' : inq.dni}</span>
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
