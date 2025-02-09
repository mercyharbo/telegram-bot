import dotenv from 'dotenv'
dotenv.config()

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

async function isAdmin(chatId, userId) {
  try {
    const admins = await bot.getChatAdministrators(chatId)
    return admins.some((admin) => admin.user.id === userId)
  } catch (error) {
    console.error('Error fetching admins:', error)
    return false
  }
}

bot.on('new_chat_members', (msg) => {
  const chatId = msg.chat.id
  const newUsers = msg.new_chat_members

  newUsers.forEach((user) => {
    const username = user.username || user.first_name
    const welcomeMessage = `🎉 Welcome to the group, ${username}! Please make sure to follow the group rules. If you post any links or violate the rules, your message will be removed.`

    bot.sendMessage(chatId, welcomeMessage)
  })
})

// bot.on('message', async (msg) => {
//   const chatId = msg.chat.id
//   const userId = msg.from.id
//   const username = msg.from.username || msg.from.first_name
//   const text = msg.text || ''

//   const isUserAdmin = await isAdmin(chatId, userId)
//   if (isUserAdmin) return

//   if (
//     linkRegex.test(text) ||
//     inviteRegex.test(text) ||
//     phoneRegex.test(text) ||
//     scamKeywords.test(text)
//   ) {
//     try {
//       await bot.deleteMessage(chatId, msg.message_id)
//       await bot.sendMessage(
//         chatId,
//         `⚠️ <a href="tg://user?id=${userId}">${username}</a>, your message was removed as it violated group rules.`,
//         { parse_mode: 'HTML' }
//       )
//     } catch (error) {
//       console.error('Error handling message:', error)
//     }
//   }
// })

bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id
    const userId = msg.from.id
    const username = msg.from.username || msg.from.first_name
    const text = msg.text || ''

    console.log(`[MESSAGE] From: ${username} (${userId}) - Text: ${text}`)

    // Ensure message is text before processing
    if (!text) return

    // Check if user is an admin
    const isUserAdmin = await isAdmin(chatId, userId)
    if (isUserAdmin) {
      console.log(`[ADMIN] User ${username} is an admin, skipping moderation.`)
      return
    }

    // Validate regex patterns exist
    if (!linkRegex || !inviteRegex || !phoneRegex || !scamKeywords) {
      console.error('[ERROR] One or more regex patterns are missing.')
      return
    }

    // Check if message violates rules
    if (
      linkRegex.test(text) ||
      inviteRegex.test(text) ||
      phoneRegex.test(text) ||
      scamKeywords.test(text)
    ) {
      console.log(
        `[VIOLATION] Message from ${username} contains restricted content.`
      )

      // Attempt to delete message
      try {
        await bot.deleteMessage(chatId, msg.message_id)
        console.log(`[DELETED] Message from ${username} removed.`)
      } catch (error) {
        console.error('[ERROR] Failed to delete message:', error)
      }

      // Notify user
      try {
        await bot.sendMessage(
          chatId,
          `⚠️ <a href="tg://user?id=${userId}">${username}</a>, your message was removed as it violated group rules.`,
          { parse_mode: 'HTML' }
        )
        console.log(`[NOTIFIED] ${username} was notified.`)
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
      console.log('✅ Meme posted to the channel!')
    } else {
      console.error('No meme URL found.')
    }
  } catch (error) {
    console.error('Error fetching meme:', error)
  }
}

const scheduleMemePosts = () => {
  setTimeout(() => {
    postMemeToChannel() // Post meme after 1 minute
  }, 60 * 1000)

  setInterval(postMemeToChannel, 4 * 60 * 60 * 1000) // Every 4 hours
}

// Export the bot and scheduling function
export { bot, scheduleMemePosts }
