import dotenv from 'dotenv'
dotenv.config()

import cron from 'node-cron'
import fetch from 'node-fetch'
import TelegramBot from 'node-telegram-bot-api'

// Environment variables
const token = process.env.BOT_TOKEN
const rapid_api_key = process.env.RAPID_API_KEY
const owner_id = process.env.OWNER_ID ? parseInt(process.env.OWNER_ID) : null
const channel_id = process.env.CHANNEL_ID || '@codewithmercy1'

// Check required environment variables
if (!token) {
  console.error('❌ BOT_TOKEN is required in .env file')
  process.exit(1)
}

if (!rapid_api_key) {
  console.warn(
    '⚠️ RAPID_API_KEY is missing in .env file. Meme functionality will not work'
  )
}

// Initialize bot
const bot = new TelegramBot(token, { polling: true })

// Check if user is an admin
async function isAdmin(chatId, userId) {
  try {
    const admins = await bot.getChatAdministrators(chatId)
    return admins.some((admin) => admin.user.id === userId)
  } catch (error) {
    console.error('Error fetching admins:', error)
    return false
  }
}

// Start bot and get info
bot
  .getMe()
  .then((botInfo) => {
    bot.botInfo = botInfo
    console.log(`🤖 Bot started as @${botInfo.username}`)
  })
  .catch((err) => {
    console.error('❌ Failed to get bot info:', err)
    process.exit(1)
  })

// Message handler
bot.on('message', async (msg) => {
  try {
    // Ensure botInfo is available
    if (!bot.botInfo) {
      console.error('[ERROR] Bot info is not initialized yet.')
      return
    }

    const chatId = msg.chat.id
    const userId = msg.from?.id
    const username =
      msg.from?.username || msg.from?.first_name || 'Unknown User'
    const text = msg.text || ''

    // Skip processing for empty messages or non-text messages
    if (!text) return

    console.log(`[MESSAGE] From: ${username} (ID: ${userId}) - ${text}`)

    // Skip messages from the bot itself
    if (userId === bot.botInfo.id) {
      console.log(`[BOT MESSAGE] Skipping check for bot's own message.`)
      return
    }

    // Check if the user is an admin or the bot owner
    const isUserAdmin = await isAdmin(chatId, userId)
    const isBotOwner = userId === owner_id

    // Skip deletion for admins and bot owner
    if (isUserAdmin || isBotOwner) {
      console.log(`[ADMIN/OWNER MESSAGE] Skipping check for: ${username}`)
      return
    }

    // Create fresh RegExp instances for each check to avoid lastIndex issues
    const linkRegex = new RegExp(
      '(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?.)+[a-z]{2,}',
      'gi'
    )
    const phoneRegex = new RegExp('\\+?\\d{10,15}', 'g')
    const scamKeywords = new RegExp(
      '(earn money|free cash|investment|quick profit|double your money|easy income|loan|betting tips|crypto giveaway|forex profit)',
      'gi'
    )

    // Check if message violates rules, excluding Telegram links
    const containsNonTelegramLink =
      linkRegex.test(text) && !text.includes('t.me/')

    // Reset RegExp lastIndex
    linkRegex.lastIndex = 0

    const containsPhone = phoneRegex.test(text)
    const containsScamKeywords = scamKeywords.test(text)

    if (containsNonTelegramLink || containsPhone || containsScamKeywords) {
      console.log(
        `[VIOLATION] Message from ${username} contains restricted content.`
      )

      try {
        await bot.deleteMessage(chatId, msg.message_id)
        console.log(`[DELETED] Message from ${username}`)

        // Send warning with a small delay to ensure message deletion completes
        setTimeout(async () => {
          try {
            await bot.sendMessage(
              chatId,
              `⚠️ <a href="tg://user?id=${userId}">${username}</a>, your message was removed as it violated group rules.`,
              { parse_mode: 'HTML' }
            )
          } catch (warningError) {
            console.error(
              '[ERROR] Failed to send warning message:',
              warningError
            )
          }
        }, 500)
      } catch (error) {
        console.error('[ERROR] Failed to delete message:', error)
        // Check if this is a permissions error
        if (error.response && error.response.statusCode === 403) {
          console.error('[PERMISSIONS] Bot lacks permission to delete messages')
        }
      }
    }
  } catch (error) {
    console.error('[ERROR] Unexpected error in message handler:', error)
  }
})

// Function to post memes to the channel
const postMemeToChannel = async () => {
  // Skip if API key is missing
  if (!rapid_api_key) {
    console.warn('Cannot post meme: RAPID_API_KEY is missing')
    return
  }

  const url = 'https://programming-memes-images.p.rapidapi.com/v1/memes'
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapid_api_key,
      'x-rapidapi-host': 'programming-memes-images.p.rapidapi.com',
    },
  }

  try {
    console.log('[MEME] Attempting to fetch and post a meme...')
    const response = await fetch(url, options)

    // Check if the response is OK
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      console.error('Invalid or empty response from meme API')
      return
    }

    const randomIndex = Math.floor(Math.random() * data.length)
    const memeUrl = data[randomIndex]?.image

    if (memeUrl) {
      await bot.sendPhoto(channel_id, memeUrl, {
        caption: '🎉 Enjoy this random programming meme!',
      })
      console.log(`✅ Meme posted to the channel (${channel_id})!`)
    } else {
      console.error('No meme URL found in the API response.')
    }
  } catch (error) {
    console.error('Error fetching or posting meme:', error)

    // Handle API rate limit errors specifically
    if (error.message && error.message.includes('429')) {
      console.error(
        'API rate limit exceeded. Consider upgrading your API plan or reducing frequency.'
      )
    }
  }
}

// Schedule meme posts with proper error handling - EVERY 2 HOURS
const scheduleMemePosts = () => {
  try {
    // Run every 2 hours (at minute 0)
    const job = cron.schedule('0 */2 * * *', () => {
      console.log(
        `🎯 Running scheduled meme post (every 2 hours) at ${new Date().toISOString()}`
      )
      postMemeToChannel().catch((err) => {
        console.error('Failed to post scheduled meme:', err)
      })
    })

    console.log('📅 Meme posting scheduled for every 2 hours')
    return job
  } catch (error) {
    console.error('Failed to schedule meme posts:', error)
    return null
  }
}

// Handle bot errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error)
})

// Handle process termination
process.on('SIGINT', () => {
  console.log('Bot is shutting down...')
  bot.stopPolling()
  process.exit(0)
})

// Command to manually post a meme
bot.onText(/\/postmeme/, async (msg) => {
  const userId = msg.from?.id
  const chatId = msg.chat.id

  // Only allow admins or owner to trigger manual meme posting
  if (userId === owner_id || (await isAdmin(chatId, userId))) {
    console.log('[COMMAND] Manual meme post triggered')
    await postMemeToChannel()
    bot.sendMessage(chatId, '✅ Meme post triggered manually')
  } else {
    bot.sendMessage(chatId, '⛔ Only admins can use this command')
  }
})

// Command to check bot status
bot.onText(/\/status/, async (msg) => {
  const userId = msg.from?.id
  const chatId = msg.chat.id

  if (userId === owner_id || (await isAdmin(chatId, userId))) {
    const nextRunTime = getNextScheduledTime()
    bot.sendMessage(
      chatId,
      `✅ Bot is running\nNext scheduled post: ${nextRunTime}`
    )
  }
})

// Helper function to get next scheduled run time
function getNextScheduledTime() {
  const now = new Date()
  const hour = now.getHours()
  const nextHour = hour + (hour % 2 === 0 ? 2 : 1)
  const nextRun = new Date(now)
  nextRun.setHours(nextHour % 24)
  nextRun.setMinutes(0)
  nextRun.setSeconds(0)

  if (nextHour < hour) {
    // If we're wrapping to the next day
    nextRun.setDate(nextRun.getDate() + 1)
  }

  return nextRun.toLocaleString()
}

// Initialize the bot
const init = () => {
  console.log('📱 Starting Telegram bot...')
  const scheduler = scheduleMemePosts()
  return { bot, scheduler }
}

// Export the bot and initialization function
export { bot, init, scheduleMemePosts }
