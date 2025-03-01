import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'
import TelegramBot from 'node-telegram-bot-api'

const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN
const TELEGRAM_CHANNEL_ID = '@codewithmercy1'

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

// Initialize Supabase
const supabaseUrl = 'https://eviftgjfblplaiksqogt.supabase.co'
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aWZ0Z2pmYmxwbGFpa3Nxb2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkxNDQyMjEsImV4cCI6MjA1NDcyMDIyMX0.NvhUFxOUcBdjXXbz1SPGLKpUBNc5J8RBC0u2p9rJ6Rs'
const supabase = createClient(supabaseUrl, supabaseKey)

// Fetch all pending posts that should be sent now
const fetchScheduledPosts = async () => {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'pending') // Only get posts that haven't been sent
    .lte('scheduled_at', now) // Get posts where scheduled_at <= current time

  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }

  return data
}

// Send posts to Telegram
const sendPost = async (post) => {
  try {
    if (post.image_url) {
      await bot.sendPhoto(TELEGRAM_CHANNEL_ID, post.image_url, {
        caption: post.text || '',
      })
    } else if (post.video_url) {
      await bot.sendVideo(TELEGRAM_CHANNEL_ID, post.video_url, {
        caption: post.text || '',
      })
    } else {
      await bot.sendMessage(TELEGRAM_CHANNEL_ID, post.text || '', {
        parse_mode: 'Markdown',
      })
    }

    // Update status to 'sent' so it doesn't send again
    await supabase
      .from('scheduled_posts')
      .update({ status: 'sent' })
      .eq('id', post.id)
    console.log(`✅ Post ${post.id} sent successfully!`)
  } catch (error) {
    console.error(`❌ Failed to send post ${post.id}:`, error)
  }
}

// Function to check and send posts every minute
const checkAndSendScheduledPosts = async () => {
  console.log('🔄 Checking for scheduled posts...')
  const posts = await fetchScheduledPosts()

  for (const post of posts) {
    await sendPost(post)
  }
}

// Start the scheduler
export const startScheduler = () => {
  console.log('⏳ Starting the scheduled post checker...')
  checkAndSendScheduledPosts() // Run immediately
  setInterval(checkAndSendScheduledPosts, 60 * 1000) // Run every minute
}
