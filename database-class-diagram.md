# Diagrama de Clases - Base de Datos QUANT

```mermaid
classDiagram
    %% Enums
    class UserRole {
        <<enumeration>>
        administrator
        accountant
    }
    
    class AvatarType {
        <<enumeration>>
        generated
        uploaded
        social
        gravatar
    }
    
    class AuditAction {
        <<enumeration>>
        create
        update
        delete
        login
        logout
        failed_login
        password_change
        photo_upload
        photo_delete
    }
    
    %% Models
    class UserAccount {
        <<Entity>>
        +Int id
        +String username
        +String email
        +String passwordHash
        +String fullName
        +UserRole role
        +String profileImageUrl
        +AvatarType avatarType
        +Boolean photoRequested
        +DateTime photoUploadedAt
        +DateTime photoReminderSentAt
        +Boolean isActive
        +DateTime lastLogin
        +DateTime lastActivity
        +Int failedLoginAttempts
        +DateTime lockedUntil
        +DateTime passwordChangedAt
        +Boolean mustChangePassword
        +String googleId
        +String facebookId
        +DateTime createdAt
        +DateTime updatedAt
        +Int createdById
        +Int updatedById
        
        +relations: UserSession[]
        +relations: RolePermission[]
        +relations: UserAuditLog[]
        +relations: UserAccount[] (createdEntries)
        +relations: UserAccount[] (updatedEntries)
        +relation: UserAccount (createdBy)
        +relation: UserAccount (updatedBy)
    }
    
    class UserSession {
        <<Entity>>
        +Int id
        +Int userId
        +String token
        +String ipAddress
        +String userAgent
        +Boolean isActive
        +DateTime expiresAt
        +DateTime lastActivity
        +DateTime createdAt
        
        +relation: UserAccount user
    }
    
    class RolePermission {
        <<Entity>>
        +Int id
        +UserRole role
        +String module
        +Boolean canRead
        +Boolean canCreate
        +Boolean canUpdate
        +Boolean canDelete
        +DateTime createdAt
        +Int createdById
        
        +relation: UserAccount createdBy
    }
    
    class UserAuditLog {
        <<Entity>>
        +Int id
        +Int userId
        +AuditAction action
        +String entityType
        +Int entityId
        +Json oldData
        +Json newData
        +String ipAddress
        +String userAgent
        +Boolean success
        +String errorMessage
        +DateTime performedAt
        
        +relation: UserAccount user
    }
    
    %% Relationships
    UserAccount ||--o{ UserSession : "has sessions"
    UserAccount ||--o{ RolePermission : "creates permissions"
    UserAccount ||--o{ UserAuditLog : "has audit logs"
    UserAccount ||--o{ UserAccount : "creates entries"
    UserAccount ||--o{ UserAccount : "updates entries"
    UserAccount }o--|| UserAccount : "created by"
    UserAccount }o--|| UserAccount : "updated by"
    UserSession }o--|| UserAccount : "belongs to"
    RolePermission }o--|| UserAccount : "created by"
    UserAuditLog }o--|| UserAccount : "performed by"
    
    %% Enum relationships
    UserAccount ..> UserRole : "uses"
    UserAccount ..> AvatarType : "uses"
    UserAuditLog ..> AuditAction : "uses"
    RolePermission ..> UserRole : "uses"
```

## Descripción del Diagrama

### Entidades Principales

1. **UserAccount**: Entidad central que representa a los usuarios del sistema
   - Contiene información de autenticación, perfil y seguridad
   - Incluye un sistema de avatar híbrido (generado, subido, social, gravatar)
   - Implementa auto-referencia para tracking de quién crea y actualiza usuarios
   - Relacionada con sesiones, permisos y logs de auditoría

2. **UserSession**: Gestiona las sesiones de usuario activas
   - Almacena tokens de sesión con expiración
   - Registra IP y user agent para seguimiento de seguridad
   - Relación de eliminación en cascada con el usuario

3. **RolePermission**: Implementa control de acceso basado en roles (RBAC)
   - Define permisos CRUD por módulo y rol
   - Restricción única compuesta (role, module)
   - Trackea quién creó cada permiso

4. **UserAuditLog**: Registro comprehensivo de auditoría
   - Registra todas las acciones importantes del sistema
   - Almacena datos anteriores y nuevos en formato JSON
   - Incluye información de contexto (IP, user agent)

### Enums

- **UserRole**: Define los roles del sistema (administrator, accountant)
- **AvatarType**: Tipos de avatar soportados
- **AuditAction**: Acciones auditables del sistema

### Patrones de Diseño Implementados

1. **Auto-referencia**: UserAccount se relaciona consigo misma para tracking de creación/actualización
2. **Auditoría completa**: Cada entidad重要 tiene tracking de quién la creó/actualizó
3. **RBAC**: Sistema de permisos granular por rol y módulo
4. **Seguridad multi-capa**: Bloqueo de cuenta, tracking de intentos fallidos, expiración de sesiones