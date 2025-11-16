# Guía de Pruebas - Subida de Imagen de Perfil

## Cómo Probar la Funcionalidad

### 1. Iniciar los Servidores

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
ng serve
```

### 2. Acceder a la Aplicación
1. Abre tu navegador en `http://localhost:4200`
2. Inicia sesión con tus credenciales
3. Navega a la sección de **Usuarios**

### 3. Registrar Usuario con Foto de Perfil

#### Pasos:
1. Completa el formulario de registro:
   - Cédula: `123-456789-0001A`
   - Email: `test@example.com`
   - Contraseña: `Password123`
   - Usuario: `testuser`
   - Rol: `accountant`

2. **Subir Foto de Perfil:**
   - Haz clic en el botón **"Subir"**
   - Selecciona una imagen de tu computadora (JPEG, PNG, GIF o WebP)
   - Verás una vista previa de la imagen seleccionada

3. Haz clic en **"Registrar"**

### 4. Verificaciones

#### A. En la UI:
- ✅ Debería aparecer el mensaje: "Usuario y foto de perfil registrados exitosamente"
- ✅ El nuevo usuario debe aparecer en la tabla de usuarios
- ✅ Si registraste tu propio usuario, tu avatar en el **sidebar izquierdo** debe actualizarse inmediatamente

#### B. En la Base de Datos:
Ejecuta esta consulta para verificar:
```sql
SELECT 
  id, 
  username, 
  profile_image_url, 
  avatar_type,
  photo_uploaded_at,
  photo_requested
FROM user_account 
WHERE username = 'testuser';
```

**Resultado Esperado:**
- `profile_image_url`: `images/profile/user-1234567890-123456789.jpg` (ejemplo)
- `avatar_type`: `uploaded`
- `photo_uploaded_at`: Fecha y hora de la subida (ej: `2025-11-16 15:45:30`)
- `photo_requested`: `false`

#### C. En el Sistema de Archivos:
Verifica que la imagen se guardó:
```bash
ls backend/public/images/profile/
```
Deberías ver archivos con nombres como: `user-1731776730123-987654321.jpg`

#### D. En los Logs de Auditoría:
```sql
SELECT 
  action, 
  entity_type, 
  entity_id, 
  new_data,
  performed_at,
  success
FROM user_audit_log 
WHERE action = 'photo_upload' 
ORDER BY performed_at DESC 
LIMIT 5;
```

### 5. Probar Actualización de Avatar en Sidebar

#### Para Actualizar tu Propio Avatar:
1. Ve a la sección de Usuarios
2. Busca tu usuario en la tabla
3. Haz clic en editar (si está implementado) o crea un nuevo usuario con tu mismo email
4. Sube una nueva imagen
5. **Observa el sidebar izquierdo** - tu avatar debe cambiar inmediatamente sin recargar la página

### 6. Casos de Error a Probar

#### A. Archivo Muy Grande:
- Intenta subir una imagen mayor a 5MB
- **Resultado esperado:** Error del servidor

#### B. Tipo de Archivo Incorrecto:
- Intenta subir un PDF o archivo de texto
- **Resultado esperado:** Error "Invalid file type"

#### C. Sin Imagen:
- Registra un usuario sin seleccionar imagen
- **Resultado esperado:** Usuario creado exitosamente sin error, con avatar por defecto

### 7. Verificar en el Navegador

#### DevTools - Network:
1. Abre las DevTools (F12)
2. Ve a la pestaña "Network"
3. Al subir una imagen, deberías ver:
   - `POST /api/users` (crear usuario)
   - `POST /api/users/:id/upload-image` (subir imagen)

#### DevTools - Console:
No debe haber errores en la consola durante el proceso.

### 8. Verificar Visualmente

La imagen debe verse:
- ✅ En el avatar del sidebar (si es el usuario actual)
- ✅ En la tabla de usuarios (si se muestra)
- ✅ Accesible vía URL: `http://localhost:3000/images/profile/user-xxxxx.jpg`

## Solución de Problemas Comunes

### Problema: "Cannot POST /api/users/:id/upload-image"
**Solución:** Asegúrate de que el servidor backend esté corriendo y que instalaste multer.

### Problema: La imagen no se muestra en el sidebar
**Solución:** 
1. Verifica que el `profileImageUrl` en la respuesta sea correcto
2. Revisa que el servidor backend esté sirviendo archivos estáticos desde `/images`
3. Verifica que el `UserProfileService` se esté actualizando correctamente

### Problema: Error 404 al cargar la imagen
**Solución:**
1. Verifica que la carpeta `backend/public/images/profile/` exista
2. Asegúrate de que el servidor tiene permisos de escritura en esa carpeta
3. Verifica la configuración de archivos estáticos en `server.ts`

### Problema: El campo `photo_uploaded_at` está en NULL
**Solución:**
1. Verifica que estés usando la versión actualizada de `user.service.ts`
2. Asegúrate de que la imagen se esté subiendo correctamente
3. Revisa los logs del servidor para ver si hay errores

## Comandos Útiles

### Ver archivos subidos:
```bash
ls -la backend/public/images/profile/
```

### Ver último log de auditoría:
```sql
SELECT * FROM user_audit_log ORDER BY performed_at DESC LIMIT 1;
```

### Limpiar imágenes de prueba:
```bash
rm backend/public/images/profile/user-*
```

### Resetear foto de un usuario:
```sql
UPDATE user_account 
SET profile_image_url = NULL, 
    avatar_type = 'generated', 
    photo_uploaded_at = NULL,
    photo_requested = true
WHERE id = 1;
```
