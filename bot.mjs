import dotenv from 'dotenv'
dotenv.config()

import cron from 'node-cron'
import fetch from 'node-fetch'
import TelegramBot from 'node-telegram-bot-api'

const token = process.env.BOT_TOKEN
const rapid_api_key = process.env.RAPID_API_KEY

const bot = new TelegramBot(token, { polling: true })

const linkRegex = /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}/gi
const inviteRegex = /(t\.me\/|joinchat|whatsapp\.com\/invite)/gi
const phoneRegex = /\+?\d{10,15}/g
const scamKeywords =
  /(earn money|free cash|investment|quick profit|double your money|easy income|loan|betting tips|crypto giveaway|forex profit)/gi

let botId = null

bot
  .getMe()
  .then((botInfo) => {
    bot.botInfo = botInfo
    console.log(`🤖 Bot started as @${botInfo.username}`)
  })
  .catch((err) => {
    console.error('❌ Failed to get bot info:', err)
  })

async function isAdmin(chatId, userId) {
  try {
    const admins = await bot.getChatAdministrators(chatId)
    return admins.some((admin) => admin.user.id === userId)
  } catch (error) {
    console.error('Error fetching admins:', error)
    return false
  }
}

bot.on('message', async (msg) => {
  try {
    // Ensure botInfo is available
    if (!bot.botInfo) {
      console.error('[ERROR] Bot info is not initialized yet.')
      return
    }

    const chatId = msg.chat.id
    const userId = msg.from?.id // Safe check for `msg.from`
    const username =
      msg.from?.username || msg.from?.first_name || 'Unknown User'
    const text = msg.text || ''

    // Ensure the message has text before processing
    if (!text) return

    console.log(`[MESSAGE] From: ${username} (ID: ${userId}) - ${text}`)

    // Check if the message is from the bot itself
    if (userId === bot.botInfo.id) {
      console.log(`[BOT MESSAGE] Skipping deletion for bot's own message.`)
      return
    }

    // Check if the user is an admin
    const isUserAdmin = await isAdmin(chatId, userId)
    const isBotOwner = userId === parseInt(process.env.OWNER_ID)

    // Skip deletion for admins and bot owner
    if (isUserAdmin || isBotOwner) {
      console.log(`[ADMIN/OWNER MESSAGE] Skipping deletion for: ${username}`)
      return
    }

    // Validate regex patterns exist
    if (!linkRegex || !inviteRegex || !phoneRegex || !scamKeywords) {
      return
    }

    // Check if message violates rules, excluding Telegram links
    const containsNonTelegramLink =
      linkRegex.test(text) && !text.includes('t.me/')
    const hasViolation =
      containsNonTelegramLink ||
      phoneRegex.test(text) ||
      scamKeywords.test(text)

    if (hasViolation) {
      console.log(
        `[VIOLATION] Message from ${username} contains restricted content.`
      )

      try {
        await bot.deleteMessage(chatId, msg.message_id)
        console.log(`[DELETED] Message from ${username}`)
      } catch (error) {
        console.error('[ERROR] Failed to delete message:', error)
      }

      try {
        await bot.sendMessage(
          chatId,
          `⚠️ <a href="tg://user?id=${userId}">${username}</a>, your message was removed as it violated group rules.`,
          { parse_mode: 'HTML' }
        )
      } catch (error) {
        console.error('[ERROR] Failed to send warning message:', error)
      }
    }
  } catch (error) {
    console.error('[ERROR] Unexpected error in message handler:', error)
  }
})

const postMemeToChannel = async () => {
  const chatId = '@codewithmercy1' // Replace with your channel ID
  const url = 'https://programming-memes-images.p.rapidapi.com/v1/memes'
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapid_api_key,
      'x-rapidapi-host': 'programming-memes-images.p.rapidapi.com',
    },
  }

  try {
    const response = await fetch(url, options)
    const data = await response.json()
    const randomIndex = Math.floor(Math.random() * data.length)
    const memeUrl = data[randomIndex]?.image

    if (memeUrl) {
      await bot.sendPhoto(chatId, memeUrl, {
        caption: '🎉 Enjoy this random programming meme!',
      })
      // console.log('✅ Meme posted to the channel!')
    } else {
      console.error('No meme URL found.')
    }
  } catch (error) {
    console.error('Error fetching meme:', error)
  }
}

const scheduleMemePosts = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', () => {
    postMemeToChannel()
    console.log('🎯 Scheduled meme post executed')
  })
}

// Export the bot and scheduling function
export { bot, scheduleMemePosts }
