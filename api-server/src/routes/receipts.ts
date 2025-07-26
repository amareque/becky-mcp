import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '../../prisma/generated'
import multer from 'multer'
import path from 'path'

const router = Router()
const prisma = new PrismaClient()

// Configure multer for image uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return cb(new Error('Only image files are allowed!'), false)
    }
    cb(null, true)
  },
})

// Process receipt/invoice image
router.post('/process-receipt', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      if (!req.file) {
        return res.status(400).json({
          message: 'No image file provided',
        })
      }

      // Convert image to base64 for API processing
      const imageBase64 = req.file.buffer.toString('base64')
      const mimeType = req.file.mimetype

      // For now, return the image data - we'll add Vision AI processing next
      res.json({
        message: 'Image received successfully',
        imageInfo: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: mimeType,
          base64Preview: imageBase64.substring(0, 100) + '...' // Just a preview
        },
        userId: decoded.userId,
        processingStatus: 'ready_for_ai_processing'
      })
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Process receipt error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    })
  }
})

// Extract data from receipt using AI Vision
router.post('/extract-receipt-data', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)
    const { imageBase64, mimeType } = req.body

    if (!imageBase64) {
      return res.status(400).json({
        message: 'Image data required',
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Here we'll integrate with Claude Vision or another AI service
      // Using Claude Vision API for real image analysis
      const claudeVisionPrompt = `
Analiza esta imagen de un recibo/factura y extrae la siguiente información en formato JSON:

{
  "amount": "monto total como número (solo el número, sin símbolos)",
  "merchant": "nombre del comercio/tienda",
  "date": "fecha en formato YYYY-MM-DD",
  "items": ["lista de productos si están visibles"],
  "category": "categoría sugerida (food, shopping, transport, entertainment, etc.)",
  "rawText": "todo el texto visible en la imagen",
  "confidence": "nivel de confianza de 0 a 1"
}

Si no puedes detectar algún campo, usa null. Responde SOLO con el JSON, sin texto adicional.
`;

      // Simulate AI Vision processing (replace with actual Claude Vision API call)
      const extractedData = {
        amount: 125.50, // Simulated extraction
        merchant: "Supermercado Central", // Simulated extraction
        date: "2025-07-26", // Simulated extraction
        items: ["Pan", "Leche", "Huevos"], // Simulated extraction
        category: "food", // Simulated suggestion
        confidence: 0.85, // Simulated confidence
        rawText: "SUPERMERCADO CENTRAL\nFecha: 26/07/2025\nPan $45.00\nLeche $35.50\nHuevos $45.00\nTOTAL: $125.50", // Simulated OCR
        needsReview: false // Auto-determined based on confidence
      }
      
      // Determine if needs review based on confidence and missing data
      extractedData.needsReview = extractedData.confidence < 0.8 || !extractedData.amount || !extractedData.merchant
      
      // TODO: Replace simulation with actual Claude Vision API call:
      /*
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: claudeVisionPrompt
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: imageBase64
                }
              }
            ]
          }]
        })
      });
      
      const claudeData = await claudeResponse.json();
      const extractedData = JSON.parse(claudeData.content[0].text);
      */
      
      res.json({
        success: true,
        extractedData,
        userId: decoded.userId,
        message: 'Receipt data extraction completed (simulation)'
      })
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Extract receipt data error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    })
  }
})

// Create expense from extracted receipt data
router.post('/create-expense-from-receipt', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header required',
      })
    }

    const token = authHeader.substring(7)
    const { 
      accountId, 
      amount, 
      merchant, 
      date, 
      category, 
      concept,
      extractedData 
    } = req.body

    if (!accountId || !amount || !merchant || !date) {
      return res.status(400).json({
        message: 'accountId, amount, merchant, and date are required',
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Verify account belongs to user
      const account = await prisma.account.findFirst({
        where: { 
          id: accountId,
          userId: decoded.userId 
        },
      })

      if (!account) {
        return res.status(404).json({
          message: 'Account not found',
        })
      }

      // Create the expense movement
      const movement = await prisma.movement.create({
        data: {
          accountId,
          type: 'expense',
          concept: concept || 'others',
          amount: parseFloat(amount),
          description: `${merchant} - Creado desde imagen`,
          date: new Date(date),
          category: category || 'receipt',
        },
      })

      res.json({
        success: true,
        movement,
        message: 'Expense created successfully from receipt',
        extractedData: extractedData || null
      })
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid token',
      })
    }
  } catch (error) {
    console.error('Create expense from receipt error:', error)
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    })
  }
})

export { router as receiptsRouter }
