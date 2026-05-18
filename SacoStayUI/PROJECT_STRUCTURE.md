# 📁 SacoStay UI - Cấu trúc Project

## 🏗️ Cấu trúc Folder (Theo MagicPattern Style)

```
src/
├── app/
│   ├── components/           # Reusable components
│   │   └── shared/
│   │       └── loading/     # Loading spinner component
│   ├── pages/              # Page components (routes)
│   │   ├── auth/           # Authentication pages
│   │   │   ├── auth.component.ts
│   │   │   ├── auth.component.html
│   │   │   └── auth.component.css
│   │   └── home/           # Home page
│   │       ├── home.component.ts
│   │       ├── home.component.html
│   │       └── home.component.css
│   ├── layouts/            # Layout components
│   ├── services/           # API services
│   │   └── auth.service.ts
│   ├── models/             # TypeScript interfaces
│   │   └── auth.models.ts
│   ├── utils/              # Utility functions
│   │   ├── constants.ts
│   │   └── helpers.ts
│   ├── core/               # Core functionality
│   │   ├── guards/         # Route guards
│   │   └── interceptors/    # HTTP interceptors
│   ├── app.config.ts       # App configuration
│   ├── app.routes.ts        # Routing configuration
│   └── app.ts              # Root component
├── environments/           # Environment variables
├── styles.css             # Global styles
├── tailwind.config.js     # Tailwind configuration
└── postcss.config.js      # PostCSS configuration
```

## 🎯 Mô tả các folder chính

### 📄 `/pages`
- **Mục đích**: Chứa các page components được mapping với routes
- **Ví dụ**: Auth, Home, Profile, Settings
- **Structure**: Mỗi page có 3 file: `.ts`, `.html`, `.css`

### 🧩 `/components`
- **Mục đích**: Reusable components dùng ở nhiều nơi
- **Ví dụ**: Loading, Button, Modal, Card
- **Structure**: Organized by feature (shared, forms, etc.)

### 🔧 `/services`
- **Mục đích**: API calls và business logic
- **Ví dụ**: AuthService, UserService, RoomService
- **Pattern**: Injectable services với RxJS

### 📝 `/models`
- **Mục đích**: TypeScript interfaces và types
- **Ví dụ**: User, Room, Booking interfaces
- **Naming**: Sử dụng `.models.ts` cho mỗi domain

### 🛠️ `/utils`
- **Mục đích**: Utility functions và helpers
- **Ví dụ**: Validators, Formatters, Constants
- **Files**: `constants.ts`, `helpers.ts`

### 🎨 `/layouts`
- **Mục đích**: Layout components (header, footer, sidebar)
- **Ví dụ**: MainLayout, AuthLayout
- **Usage**: Wrapper cho pages

### 🏛️ `/core`
- **Mục đích**: Core app functionality
- **Ví dụ**: Guards, Interceptors, Base classes
- **Access**: Global và không thay đổi thường xuyên

## 🔄 Luồng hoạt động

1. **Route → Page**: `app.routes.ts` → `/pages/`
2. **Page → Components**: Page components import từ `/components/`
3. **Page → Services**: API calls qua `/services/`
4. **Services → Models**: Data typing qua `/models/`
5. **Utils → All**: Helper functions từ `/utils/`

## 📋 Quy tắc đặt tên

### Components
- **Selector**: `kebab-case` (app-auth, app-home)
- **Class**: `PascalCase` (AuthComponent, HomeComponent)
- **Files**: `component-name.component.ts/html/css`

### Services
- **Class**: `PascalCase` + `Service` (AuthService, UserService)
- **Files**: `service-name.service.ts`

### Models
- **Interface**: `PascalCase` (User, Room, Booking)
- **Files**: `domain.models.ts`

### Utils
- **Functions**: `camelCase` (formatDate, isValidEmail)
- **Constants**: `UPPER_SNAKE_CASE` (API_BASE_URL, TOKEN_KEY)

## 🎨 Design System

### Colors (Tailwind)
- `saco-orange`: #FF9F43 (Primary)
- `saco-orange-dark`: #FF8C2A (Primary hover)
- `saco-blue`: #1A1A2E (Text)
- `saco-gray`: #6B7280 (Secondary)

### Components
- **Buttons**: `.btn-primary-saco`, `.btn-secondary`
- **Inputs**: `.input-saco`
- **Cards**: `.card-saco`
- **Loading**: `<app-loading>`

## 🚀 Development Workflow

1. **Tạo page mới**: Thêm vào `/pages/` và update routes
2. **Tạo component**: Thêm vào `/components/shared/` hoặc feature folder
3. **Tạo service**: Thêm vào `/services/` với injectable pattern
4. **Tạo model**: Thêm vào `/models/` với proper typing
5. **Tạo utility**: Thêm vào `/utils/` nếu reusable

## 📦 Dependencies

### Core
- Angular 20 (standalone components)
- TypeScript
- RxJS

### UI
- Tailwind CSS v3
- ng-zorro-antd (legacy)

### Development
- Angular CLI
- ESLint (nếu có)
- Prettier (nếu có)

## 🌐 Routes Structure

```
/                    → Home (authenticated)
/login              → Auth page (login mode)
/register           → Auth page (register mode)
/auth               → Auth page (default login)
/dashboard          → Dashboard (authenticated)
/profile            → User profile (authenticated)
/settings           → Settings (authenticated)
```

## BACKEND ENDPOINT JSON/YAML: 
{
  "openapi": "3.0.1",
  "info": {
    "title": "SacoStay API",
    "version": "v1"
  },
  "paths": {
    "/api/Auth/login": {
      "post": {
        "tags": [
          "Auth"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LoginDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/LoginDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/LoginDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Auth/profile": {
      "get": {
        "tags": [
          "Auth"
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Auth/register": {
      "post": {
        "tags": [
          "Auth"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RegisterDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/RegisterDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/RegisterDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Auth/resend-otp": {
      "post": {
        "tags": [
          "Auth"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ResendOtpDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/ResendOtpDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/ResendOtpDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Auth/verify-email-otp": {
      "post": {
        "tags": [
          "Auth"
        ],
        "parameters": [
          {
            "name": "email",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "otp",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Auth/forgot-password": {
      "post": {
        "tags": [
          "Auth"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ResendOtpDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/ResendOtpDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/ResendOtpDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Auth/verify-reset-otp": {
      "post": {
        "tags": [
          "Auth"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/VerifyOtpDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/VerifyOtpDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/VerifyOtpDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Auth/reset-password": {
      "post": {
        "tags": [
          "Auth"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ResetPasswordDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/ResetPasswordDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/ResetPasswordDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Auth/upload-profile-images": {
      "post": {
        "tags": [
          "Auth"
        ],
        "requestBody": {
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "files": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "format": "binary"
                    }
                  }
                }
              },
              "encoding": {
                "files": {
                  "style": "form"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Auth/delete-profile-image": {
      "delete": {
        "tags": [
          "Auth"
        ],
        "parameters": [
          {
            "name": "imageUrl",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Auth/update-profile": {
      "put": {
        "tags": [
          "Auth"
        ],
        "requestBody": {
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "FirstName": {
                    "type": "string"
                  },
                  "LastName": {
                    "type": "string"
                  },
                  "Gender": {
                    "type": "boolean"
                  },
                  "DateOfBirth": {
                    "type": "string",
                    "format": "date"
                  },
                  "PhoneNumber": {
                    "type": "string"
                  },
                  "Job": {
                    "type": "string"
                  },
                  "LivingArea": {
                    "type": "string"
                  },
                  "Bio": {
                    "type": "string"
                  },
                  "AvatarFile": {
                    "type": "string",
                    "format": "binary"
                  }
                }
              },
              "encoding": {
                "FirstName": {
                  "style": "form"
                },
                "LastName": {
                  "style": "form"
                },
                "Gender": {
                  "style": "form"
                },
                "DateOfBirth": {
                  "style": "form"
                },
                "PhoneNumber": {
                  "style": "form"
                },
                "Job": {
                  "style": "form"
                },
                "LivingArea": {
                  "style": "form"
                },
                "Bio": {
                  "style": "form"
                },
                "AvatarFile": {
                  "style": "form"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Chat/history/{otherUserId}": {
      "get": {
        "tags": [
          "Chat"
        ],
        "parameters": [
          {
            "name": "otherUserId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Lifestyle/question": {
      "post": {
        "tags": [
          "Lifestyle"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateQuestionDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateQuestionDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/CreateQuestionDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Lifestyle/questions": {
      "get": {
        "tags": [
          "Lifestyle"
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Lifestyle/submit": {
      "post": {
        "tags": [
          "Lifestyle"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UserSubmitLifestyleDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/UserSubmitLifestyleDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/UserSubmitLifestyleDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Lifestyle/match/{targetUserId}": {
      "get": {
        "tags": [
          "Lifestyle"
        ],
        "parameters": [
          {
            "name": "targetUserId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Lifestyle/swipe-deck": {
      "get": {
        "tags": [
          "Lifestyle"
        ],
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "format": "int32",
              "default": 10
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Lifestyle/swipe": {
      "post": {
        "tags": [
          "Lifestyle"
        ],
        "parameters": [
          {
            "name": "targetUserId",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "isLike",
            "in": "query",
            "schema": {
              "type": "boolean"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Payment/buy-package": {
      "post": {
        "tags": [
          "Payment"
        ],
        "parameters": [
          {
            "name": "roomPostId",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          },
          {
            "name": "packageName",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Payment/vnpay-return": {
      "get": {
        "tags": [
          "Payment"
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/RoomPost/create": {
      "post": {
        "tags": [
          "RoomPost"
        ],
        "requestBody": {
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "Title": {
                    "type": "string"
                  },
                  "Description": {
                    "type": "string"
                  },
                  "DetailedAddress": {
                    "type": "string"
                  },
                  "City": {
                    "type": "string"
                  },
                  "District": {
                    "type": "string"
                  },
                  "Area": {
                    "type": "number",
                    "format": "double"
                  },
                  "MaxPeople": {
                    "type": "integer",
                    "format": "int32"
                  },
                  "Price": {
                    "type": "number",
                    "format": "double"
                  },
                  "Amenities": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "Location.Latitude": {
                    "type": "number",
                    "format": "double"
                  },
                  "Location.Longitude": {
                    "type": "number",
                    "format": "double"
                  },
                  "ImageFiles": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "format": "binary"
                    }
                  }
                }
              },
              "encoding": {
                "Title": {
                  "style": "form"
                },
                "Description": {
                  "style": "form"
                },
                "DetailedAddress": {
                  "style": "form"
                },
                "City": {
                  "style": "form"
                },
                "District": {
                  "style": "form"
                },
                "Area": {
                  "style": "form"
                },
                "MaxPeople": {
                  "style": "form"
                },
                "Price": {
                  "style": "form"
                },
                "Amenities": {
                  "style": "form"
                },
                "Location.Latitude": {
                  "style": "form"
                },
                "Location.Longitude": {
                  "style": "form"
                },
                "ImageFiles": {
                  "style": "form"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/RoomPost/my-posts": {
      "get": {
        "tags": [
          "RoomPost"
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/RoomPost/search-nearby": {
      "get": {
        "tags": [
          "RoomPost"
        ],
        "parameters": [
          {
            "name": "userLat",
            "in": "query",
            "schema": {
              "type": "number",
              "format": "double"
            }
          },
          {
            "name": "userLng",
            "in": "query",
            "schema": {
              "type": "number",
              "format": "double"
            }
          },
          {
            "name": "radiusInKm",
            "in": "query",
            "schema": {
              "type": "number",
              "format": "double",
              "default": 3
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/RoomPost/{id}/analytics": {
      "get": {
        "tags": [
          "RoomPost"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/RoomPost/{id}/view": {
      "post": {
        "tags": [
          "RoomPost"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "CreateQuestionDTO": {
        "type": "object",
        "properties": {
          "content": {
            "type": "string",
            "nullable": true
          },
          "options": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "nullable": true
          }
        },
        "additionalProperties": false
      },
      "LoginDTO": {
        "type": "object",
        "properties": {
          "emailPhoneorUsername": {
            "type": "string",
            "nullable": true
          },
          "password": {
            "type": "string",
            "nullable": true
          }
        },
        "additionalProperties": false
      },
      "RegisterDTO": {
        "required": [
          "confirmPassword",
          "email",
          "password",
          "role",
          "userName"
        ],
        "type": "object",
        "properties": {
          "userName": {
            "minLength": 1,
            "type": "string"
          },
          "email": {
            "minLength": 1,
            "type": "string",
            "format": "email"
          },
          "phoneNumber": {
            "type": "string",
            "nullable": true
          },
          "firstName": {
            "type": "string",
            "nullable": true
          },
          "lastName": {
            "type": "string",
            "nullable": true
          },
          "password": {
            "minLength": 6,
            "type": "string"
          },
          "confirmPassword": {
            "minLength": 1,
            "type": "string"
          },
          "role": {
            "minLength": 1,
            "type": "string"
          }
        },
        "additionalProperties": false
      },
      "ResendOtpDTO": {
        "required": [
          "email"
        ],
        "type": "object",
        "properties": {
          "email": {
            "minLength": 1,
            "type": "string",
            "format": "email"
          }
        },
        "additionalProperties": false
      },
      "ResetPasswordDTO": {
        "required": [
          "confirmPassword",
          "email",
          "newPassword"
        ],
        "type": "object",
        "properties": {
          "email": {
            "minLength": 1,
            "type": "string",
            "format": "email"
          },
          "newPassword": {
            "minLength": 6,
            "type": "string"
          },
          "confirmPassword": {
            "minLength": 1,
            "type": "string"
          }
        },
        "additionalProperties": false
      },
      "UserSubmitLifestyleDTO": {
        "type": "object",
        "properties": {
          "selectedOptionIds": {
            "type": "array",
            "items": {
              "type": "integer",
              "format": "int32"
            },
            "nullable": true
          }
        },
        "additionalProperties": false
      },
      "VerifyOtpDTO": {
        "type": "object",
        "properties": {
          "email": {
            "type": "string",
            "nullable": true
          },
          "otp": {
            "type": "string",
            "nullable": true
          }
        },
        "additionalProperties": false
      }
    },
    "securitySchemes": {
      "Bearer": {
        "type": "http",
        "description": "Chỉ cần dán trực tiếp JWT Token của bạn vào ô dưới đây (Không cần gõ chữ Bearer)",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  },
  "security": [
    {
      "Bearer": [ ]
    }
  ]
}