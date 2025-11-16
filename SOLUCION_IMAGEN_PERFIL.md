# Solución: Subida y Actualización de Imagen de Perfil

## Problemas Identificados

### 1. Backend: Campo `photo_uploaded_at` no se actualizaba
**Causa**: El método `updateUser()` en `user.service.ts` no establecía el campo `photoUploadedAt` cuando se subía una imagen de perfil.

**Solución Implementada**:
- Se modificó el método `updateUser()` para establecer `photoUploadedAt` y `photoRequested` cuando se detecta una imagen personalizada.

### 2. Backend: No existía endpoint para subir archivos
**Causa**: No había ningún endpoint ni middleware configurado para manejar la carga de archivos de imagen.

**Soluciones Implementadas**:
- Se creó `upload.middleware.ts` con configuración de Multer para manejar archivos de imagen.
- Se agregó el método `uploadProfileImage()` en `user.service.ts` para procesar la subida.
- Se agregó el controlador `uploadProfileImage()` en `user.controller.ts`.
- Se agregó la ruta `POST /api/users/:id/upload-image` en `user.routes.ts`.
- Se configuró Express para servir archivos estáticos desde `/images`.

### 3. Frontend: La imagen no se enviaba al servidor
**Causa**: El formulario seleccionaba el archivo pero nunca lo enviaba al backend.

**Soluciones Implementadas**:
- Se agregó el método `uploadProfileImage()` en `users.service.ts`.
- Se modificó `onSubmit()` en `usuarios.component.ts` para enviar la imagen después de crear el usuario.
- Se agregó la actualización automática del perfil en el sidebar cuando el usuario actual sube su foto.

## Archivos Modificados

### Backend

#### 1. `backend/src/modules/user/user.service.ts`
- Modificado el método `updateUser()` para establecer `photoUploadedAt` cuando se sube una imagen personalizada.
- Agregado el método `uploadProfileImage()` para manejar la carga de imágenes con registro de auditoría.

#### 2. `backend/src/modules/user/user.controller.ts`
- Agregado el método `uploadProfileImage()` para procesar solicitudes de carga de imágenes.

#### 3. `backend/src/modules/user/user.routes.ts`
- Agregada la ruta `POST /:id/upload-image` con middleware de Multer.

#### 4. `backend/src/server.ts`
- Configurado Express para servir archivos estáticos desde el directorio `/images`.

### Archivos Nuevos

#### 5. `backend/src/middleware/upload.middleware.ts` (NUEVO)
Configuración de Multer con:
- Almacenamiento en `public/images/profile/`
- Nombres de archivo únicos con timestamp
- Filtro de tipos de archivo (JPEG, PNG, GIF, WebP)
- Límite de 5MB por archivo

### Frontend

#### 6. `frontend/src/app/shared/services/users.service.ts`
- Agregado el método `uploadProfileImage()` para enviar archivos al backend.

#### 7. `frontend/src/app/usuarios/usuarios.component.ts`
- Importado `UserProfileService` para actualizar el perfil del sidebar.
- Modificado `onSubmit()` para:
  - Subir la imagen después de crear el usuario
  - Actualizar el perfil en el sidebar si es el usuario actual
  - Mostrar mensajes de éxito/error apropiados

## Pasos Pendientes para Completar la Implementación

### 1. Instalar dependencia de Multer
```bash
cd backend
npm install multer
npm install --save-dev @types/multer
```

### 2. Crear directorio para imágenes
El middleware creará automáticamente el directorio, pero puedes crearlo manualmente:
```bash
mkdir -p backend/public/images/profile
```

### 3. Reiniciar los servidores
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
ng serve
```

## Flujo de Funcionamiento

### Al Registrar un Usuario con Foto:

1. **Usuario completa el formulario** y selecciona una imagen (frontend)
2. **Se crea el usuario** sin imagen mediante `POST /api/users`
3. **Si hay imagen seleccionada**, se envía mediante `POST /api/users/:id/upload-image`
4. **Backend recibe el archivo**, lo guarda en `public/images/profile/` con nombre único
5. **Backend actualiza el registro** del usuario:
   - `profileImageUrl`: ruta relativa de la imagen
   - `avatarType`: cambia a `uploaded`
   - `photoUploadedAt`: se establece con la fecha/hora actual
   - `photoRequested`: se establece en `false`
6. **Se registra en auditoría** la acción `photo_upload`
7. **Frontend recibe la respuesta** y actualiza:
   - Lista de usuarios
   - Perfil del sidebar (si es el usuario actual)
8. **Sidebar muestra la imagen** actualizada inmediatamente

## Validaciones Implementadas

### Backend:
- Solo se aceptan imágenes (JPEG, PNG, GIF, WebP)
- Tamaño máximo: 5MB
- Nombres de archivo únicos para evitar colisiones
- Validación de usuario existente antes de subir

### Frontend:
- Preview de la imagen antes de enviar
- Mensajes de error claros
- Manejo de estados de carga
- Actualización automática del UI

## Auditoría

Cada subida de imagen queda registrada en `user_audit_log` con:
- `action`: `photo_upload`
- `userId`: ID del usuario que realiza la acción
- `entityId`: ID del usuario al que se le sube la foto
- `newData`: Información de la imagen subida
- `ipAddress` y `userAgent`: Datos de la solicitud
- `performedAt`: Timestamp de la acción

## Notas Adicionales

- Las imágenes se almacenan localmente en `backend/public/images/profile/`
- Para producción, considera usar un servicio de almacenamiento en la nube (AWS S3, Google Cloud Storage, etc.)
- El campo `photo_uploaded_at` ahora se actualiza correctamente cada vez que se sube una nueva imagen
- El avatar en el sidebar se actualiza en tiempo real sin necesidad de recargar la página
