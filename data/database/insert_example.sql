-- Insertar Propietaria
INSERT INTO propietarios (nombre, ruc_dni, ultimo_digito) 
VALUES ('Madre', 'XXXXXXXXXX1', 1);

-- Insertar Inquilinos (Asumiendo que Propietaria ID es 1)
INSERT INTO inquilinos (propietario_id, nombre, dni, departamento, monto_alquiler)
VALUES 
(1, 'Inquilino 1', '12345678', '101', 1200.00),
(1, 'Inquilino 2', '87654321', '102', 850.00),
(1, 'Inquilino 3', '45678912', '201', 920.00),
(1, 'Inquilino 4', '78912345', '202', 980.00);

-- Insertar Cronograma 2026 (Dígito 1)
INSERT INTO cronograma_sunat (ultimo_digito, mes_periodo, anio_periodo, fecha_vencimiento)
VALUES 
(1, '03', 2026, '2026-04-20'),
(1, '04', 2026, '2026-05-19');

-- Insertar Estados de Marzo 2026
-- Inquilino 1: Alquiler pendiente, Tributo pendiente
INSERT INTO pagos_alquiler (inquilino_id, mes_periodo, anio_periodo, monto_pagado, pagado) VALUES (1, '03', 2026, 0, false);
INSERT INTO pagos_tributos (inquilino_id, mes_periodo, anio_periodo, monto_tributo) VALUES (1, '03', 2026, 1200 * 0.05);

-- Inquilino 2: Alquiler pagado, Tributo pagado
INSERT INTO pagos_alquiler (inquilino_id, mes_periodo, anio_periodo, monto_pagado, pagado, fecha_pago) VALUES (2, '03', 2026, 850.00, true, '2026-03-05');
INSERT INTO pagos_tributos (inquilino_id, mes_periodo, anio_periodo, monto_tributo, estado_pago, fecha_pago_sunat) VALUES (2, '03', 2026, 850 * 0.05, 'pagado', '2026-03-06');