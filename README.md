# Panel de ventas

Miniapp en React + TypeScript para registrar, editar y consultar ventas almacenadas en Supabase. El panel usa autenticación de Supabase; cada cuenta solo puede acceder a sus propios registros mediante RLS.

## Funciones
- Crear cuenta e iniciar sesión.
- Registrar y editar ventas con cliente, concepto, importe, fecha y estado.
- Resumen de ingresos cobrados, por cobrar, ventas registradas y promedio.
- Moneda inicial: MXN.

## Supabase
La migración `supabase/migrations/001_sales.sql` crea la tabla `sales`, activa RLS y restringe lectura, inserción y actualización a las ventas de la cuenta autenticada. La aplicación se conecta mediante el cliente compartido en `src/lib/supabase.ts`.
