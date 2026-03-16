-- 1. Maestros
CREATE TABLE public.propietarios (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    ruc_dni TEXT NOT NULL UNIQUE,
    ultimo_digito INTEGER NOT NULL CHECK (ultimo_digito BETWEEN 0 AND 9),
    tasa_arrendamiento NUMERIC DEFAULT 0.05
);

CREATE TABLE public.inquilinos (
    id SERIAL PRIMARY KEY,
    propietario_id INTEGER REFERENCES public.propietarios(id),
    nombre TEXT NOT NULL,
    dni TEXT NOT NULL,
    departamento TEXT,
    monto_alquiler NUMERIC NOT NULL,
    activo BOOLEAN DEFAULT true
);

-- 2. Referencia (SUNAT)
CREATE TABLE public.cronograma_sunat (
    id SERIAL PRIMARY KEY,
    ultimo_digito INTEGER NOT NULL,
    mes_periodo TEXT NOT NULL,
    anio_periodo INTEGER NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    UNIQUE(ultimo_digito, mes_periodo, anio_periodo)
);

-- 3. Transacciones: Alquiler (Inquilino -> Madre)
CREATE TABLE public.pagos_alquiler (
    id SERIAL PRIMARY KEY,
    inquilino_id INTEGER REFERENCES public.inquilinos(id),
    mes_periodo TEXT NOT NULL,
    anio_periodo INTEGER NOT NULL,
    monto_pagado NUMERIC(10,2),
    pagado BOOLEAN DEFAULT false,
    fecha_pago DATE,
    metodo_pago TEXT,
    UNIQUE(inquilino_id, mes_periodo, anio_periodo)
);

-- 4. Transacciones: Tributos (Madre -> SUNAT)
CREATE TABLE public.pagos_tributos (
    id SERIAL PRIMARY KEY,
    inquilino_id INTEGER REFERENCES public.inquilinos(id),
    mes_periodo TEXT NOT NULL,
    anio_periodo INTEGER NOT NULL,
    monto_tributo NUMERIC(10,2),
    estado_pago TEXT DEFAULT 'pendiente', -- 'pendiente', 'pagado'
    fecha_pago_sunat DATE,
    UNIQUE(inquilino_id, mes_periodo, anio_periodo)
);