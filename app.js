// app.js
import dotenv from 'dotenv'
import express from 'express'
import { scheduleMemePosts } from './bot.mjs'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

// Start the bot schedule
scheduleMemePosts()

// Set up a simple route for testing
app.get('/', (req, res) => {
  res.send('Bot and Express app are running!')
})

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
