/**
 * Servicio para manejar imágenes de productos
 * Soporta almacenamiento offline-first con base64
 */

/**
 * Convierte un archivo de imagen a base64
 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Valida que el archivo sea una imagen válida
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Validar tipo
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'El archivo debe ser una imagen (JPG, PNG, WEBP o GIF)'
    }
  }

  // Validar tamaño (máximo 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'La imagen no puede superar los 5MB'
    }
  }

  return { valid: true }
}

/**
 * Redimensiona una imagen para optimizar su tamaño
 * Mantiene la relación de aspecto
 */
export function resizeImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calcular nuevas dimensiones manteniendo la relación de aspecto
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al redimensionar la imagen'))
              return
            }
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(resizedFile)
          },
          file.type,
          quality
        )
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Procesa una imagen: valida, redimensiona y convierte a base64
 */
export async function processImage(file: File): Promise<string> {
  // Validar
  const validation = validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error || 'Imagen inválida')
  }

  // Redimensionar si es necesario
  let processedFile = file
  try {
    processedFile = await resizeImage(file, 800, 800, 0.8)
  } catch (error) {
    console.warn('Error al redimensionar imagen, usando original:', error)
    processedFile = file
  }

  // Convertir a base64
  return imageToBase64(processedFile)
}

/**
 * Obtiene la URL de una imagen (base64 o URL externa)
 */
export function getImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) return null
  
  // Si ya es una URL completa (http/https), devolverla tal cual
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // Si es base64, devolverla tal cual
  if (imageUrl.startsWith('data:image/')) {
    return imageUrl
  }
  
  // Si es una ruta relativa, construir la URL completa
  // (asumiendo que las imágenes se sirven desde el backend)
  return `/api/images/${imageUrl}`
}

