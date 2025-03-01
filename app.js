import dotenv from 'dotenv'
import express from 'express'
import { init } from './bot.mjs'

// Load environment variables first
dotenv.config()

const app = express()
const port = process.env.PORT || 3000

// Initialize the application
const startApp = async () => {
  try {
    console.log('📱 Starting application...')

    // Initialize the bot and scheduler
    const { bot, scheduler } = init()

    // Store references for cleanup
    app.locals.bot = bot
    app.locals.scheduler = scheduler

    console.log('🤖 Bot initialization complete')
    console.log('📊 Meme posting schedule: Every 2 hours')

    // Basic middleware for logging requests
    app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
      next()
    })

    // Set up routes
    app.get('/', (req, res) => {
      res.send(
        'Bot and Express app are running! Memes are posted every 2 hours.'
      )
    })

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'up',
        schedule: 'Every 2 hours',
        timestamp: new Date().toISOString(),
        bot: bot.botInfo ? `@${bot.botInfo.username}` : 'initializing',
      })
    })

    // Start the Express server
    const server = app.listen(port, () => {
      console.log(`✅ Server running on port ${port}`)
    })

    // Handle graceful shutdown
    const gracefulShutdown = () => {
      console.log('🛑 Received shutdown signal, closing application...')

      // Stop the scheduler if it exists
      if (app.locals.scheduler) {
        app.locals.scheduler.stop()
      }

      // Stop bot polling
      if (app.locals.bot) {
        app.locals.bot.stopPolling()
      }

      // Close server
      server.close(() => {
        console.log('👋 Server closed successfully')
        process.exit(0)
      })

      // Force close after timeout
      setTimeout(() => {
        console.error(
          '⚠️ Could not close connections in time, forcing shutdown'
        )
        process.exit(1)
      }, 10000)
    }

    // Register shutdown handlers
    process.on('SIGTERM', gracefulShutdown)
    process.on('SIGINT', gracefulShutdown)
  } catch (error) {
    console.error('❌ Error starting application:', error)
    process.exit(1)
  }
}

// Start the application
startApp()
