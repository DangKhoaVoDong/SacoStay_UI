{
  "openapi": "3.0.1",
  "info": {
    "title": "SacoStay API",
    "version": "v1"
  },
  "paths": {
    "/api/Admin/dashboard": {
      "get": {
        "tags": [
          "Admin"
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Admin/users": {
      "get": {
        "tags": [
          "Admin"
        ],
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "format": "int32",
              "default": 100
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
    "/api/Admin/room-posts": {
      "get": {
        "tags": [
          "Admin"
        ],
        "parameters": [
          {
            "name": "status",
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
    "/api/Admin/room-posts/{id}/approve": {
      "post": {
        "tags": [
          "Admin"
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
    "/api/Admin/room-posts/{id}/reject": {
      "post": {
        "tags": [
          "Admin"
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
    "/api/Auth/user/{userId}": {
      "get": {
        "tags": [
          "Auth"
        ],
        "parameters": [
          {
            "name": "userId",
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
      },
      "put": {
        "tags": [
          "Lifestyle"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateQuestionDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateQuestionDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateQuestionDTO"
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
    "/api/Lifestyle/my-answers": {
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
    "/api/Lifestyle/answers/{userId}": {
      "get": {
        "tags": [
          "Lifestyle"
        ],
        "parameters": [
          {
            "name": "userId",
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
          },
          {
            "name": "includeSwiped",
            "in": "query",
            "schema": {
              "type": "boolean",
              "default": false
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
    "/api/Lifestyle/my-likes": {
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
    "/api/Lifestyle/my-likes/{targetUserId}": {
      "delete": {
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
    "/api/Lifestyle/swipe-quota": {
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
    "/api/Lifestyle/options": {
      "put": {
        "tags": [
          "Lifestyle"
        ],
        "parameters": [
          {
            "name": "questionId",
            "in": "query",
            "schema": {
              "type": "integer",
              "format": "int32"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/UpdateOptionDTO"
                }
              }
            },
            "text/json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/UpdateOptionDTO"
                }
              }
            },
            "application/*+json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/UpdateOptionDTO"
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
    "/api/Payment/buy-landlord-package": {
      "post": {
        "tags": [
          "Payment"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/BuyLandlordPackageDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/BuyLandlordPackageDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/BuyLandlordPackageDTO"
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
    "/api/Payment/buy-tenant-package": {
      "post": {
        "tags": [
          "Payment"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/BuyTenantPackageDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/BuyTenantPackageDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/BuyTenantPackageDTO"
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
    "/api/Payment/payos-return": {
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
    "/api/Payment/payos-webhook": {
      "post": {
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
    "/api/Payment/history": {
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
    "/api/RoomPost/{id}/status": {
      "put": {
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
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateRoomPostStatusDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateRoomPostStatusDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateRoomPostStatusDTO"
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
    "/api/RoomPost/{id}": {
      "delete": {
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
      "BuyLandlordPackageDTO": {
        "type": "object",
        "properties": {
          "roomPostId": {
            "type": "string",
            "format": "uuid"
          },
          "packageName": {
            "type": "string",
            "nullable": true
          }
        },
        "additionalProperties": false
      },
      "BuyTenantPackageDTO": {
        "type": "object",
        "properties": {
          "packageName": {
            "type": "string",
            "nullable": true
          }
        },
        "additionalProperties": false
      },
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
      "UpdateOptionDTO": {
        "type": "object",
        "properties": {
          "optionId": {
            "type": "integer",
            "format": "int32",
            "nullable": true
          },
          "content": {
            "type": "string",
            "nullable": true
          }
        },
        "additionalProperties": false
      },
      "UpdateQuestionDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int32",
            "nullable": true
          },
          "content": {
            "type": "string",
            "nullable": true
          }
        },
        "additionalProperties": false
      },
      "UpdateRoomPostStatusDTO": {
        "type": "object",
        "properties": {
          "status": {
            "type": "string",
            "nullable": true
          },
          "currentPeople": {
            "type": "integer",
            "format": "int32",
            "nullable": true
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