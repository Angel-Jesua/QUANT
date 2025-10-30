# 🔐 Credenciales de Acceso - Base de Datos QUANT

## Usuarios de Prueba

### 👨‍💼 Administrador
- **Email:** `admin@quant.com`
- **Contraseña:** `Admin123!`
- **Rol:** Administrator
- **Permisos:** Acceso completo a todos los módulos (crear, leer, actualizar, eliminar)

### 👤 Contador
- **Email:** `accountant@quant.com`
- **Contraseña:** `Account123!`
- **Rol:** Accountant
- **Permisos:** 
  - Lectura en todos los módulos
  - Crear/Actualizar en reportes y auditoría
  - Sin permisos de eliminación
  - Sin permisos de crear/actualizar usuarios y configuración

## Notas Importantes

- Las contraseñas están hasheadas con **bcrypt** (10 salt rounds)
- Ambos usuarios están activos (`isActive: true`)
- Las contraseñas cumplen con los requisitos de seguridad:
  - Mínimo 8 caracteres
  - Al menos una letra mayúscula
  - Al menos una letra minúscula
  - Al menos un número
  - Al menos un carácter especial

## Módulos con Permisos Configurados

1. **users** - Gestión de usuarios
2. **reports** - Reportes
3. **settings** - Configuración del sistema
4. **audit** - Auditoría y logs

## Cómo Usar

Para iniciar sesión en la aplicación, usa cualquiera de las credenciales anteriores en el formulario de login del frontend.

---

**Fecha de creación:** ${new Date().toLocaleDateString('es-MX')}
