// require('dotenv').config()
import dotenv from 'dotenv' // Use import instead of require
dotenv.config()

import fetch from 'node-fetch' // Use import instead of require
import TelegramBot from 'node-telegram-bot-api'

const token = process.env.BOT_TOKEN
// const my_group_chat_id = process.env.YOUR_GROUP_CHAT_ID
const rapid_api_key = process.env.RAPID_API_KEY

const bot = new TelegramBot(token, { polling: true })

const linkRegex = /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}/gi
const inviteRegex = /(t\.me\/|joinchat|whatsapp\.com\/invite)/gi
const phoneRegex = /\+?\d{10,15}/g
const scamKeywords =
  /(earn money|free cash|investment|quick profit|double your money|easy income|loan|betting tips|crypto giveaway|forex profit)/gi

// Send a welcome message when a new user joins the group
bot.on('new_chat_members', (msg) => {
  const chatId = msg.chat.id
  const newUsers = msg.new_chat_members

  newUsers.forEach((user) => {
    const username = user.username || user.first_name
    const welcomeMessage = `🎉 Welcome to the group, ${username}! Please make sure to follow the group rules. If you post any links or violate the rules, your message will be removed.`

    bot.sendMessage(chatId, welcomeMessage)
  })
})

/**
 * The function `isAdmin` checks if a user is an administrator in a chat by fetching the chat
 * administrators and comparing their user IDs.
 * @param chatId - The `chatId` parameter represents the unique identifier of the chat or group where
 * you want to check if a user is an administrator.
 * @param userId - The `userId` parameter represents the unique identifier of a user in the chat.
 * @returns The function `isAdmin` returns a boolean value. It returns `true` if the user with the
 * specified `userId` is an administrator in the chat with the specified `chatId`, and `false`
 * otherwise. If there is an error while fetching the administrators, it will log the error and return
 * `false`.
 */
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
  const chatId = msg.chat.id
  const userId = msg.from.id
  const username = msg.from.username || msg.from.first_name
  const text = msg.text || ''

  const isUserAdmin = await isAdmin(chatId, userId)
  if (isUserAdmin) return // Allow admins to post anything

  if (
    linkRegex.test(text) ||
    inviteRegex.test(text) ||
    phoneRegex.test(text) ||
    scamKeywords.test(text)
  ) {
    try {
      // Delete the violating message
      await bot.deleteMessage(chatId, msg.message_id)

      // Send a warning message mentioning the user in a way that is clickable
      await bot.sendMessage(
        chatId,
        `⚠️ <a href="tg://user?id=${userId}">${username}</a>, your message was removed as it violated group rules.`,
        { parse_mode: 'HTML' }
      )
    } catch (error) {
      console.error('Error handling message:', error)
    }
  }
})

const chatId = '@codewithmercy1' // Replace with your channel ID (e.g., @your_channel_name)

const url = 'https://programming-memes-images.p.rapidapi.com/v1/memes'
const options = {
  method: 'GET',
  headers: {
    'x-rapidapi-key': rapid_api_key, // Replace with your RapidAPI key
    'x-rapidapi-host': 'programming-memes-images.p.rapidapi.com',
  },
}

// Function to fetch meme and post to channel
const postMemeToChannel = async () => {
  try {
    const response = await fetch(url, options)
    const data = await response.json()

    // Pick a random index from the array
    const randomIndex = Math.floor(Math.random() * data.length)
    const memeUrl = data[randomIndex]?.image // Accessing the `image` field from the randomly selected item

    console.log('data', data)
    console.log('Random Meme URL:', memeUrl)

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

// Function to schedule meme posts
const scheduleMemePosts = () => {
  // Run the post once 1 minute after startup
  setTimeout(() => {
    postMemeToChannel() // Post meme after 1 minute
  }, 60 * 1000) // 1 minute delay (60 seconds)

  // Post a meme 5 times a day (every 4 hours)
  setInterval(postMemeToChannel, 4 * 60 * 60 * 1000) // Every 4 hours
}

// Start the scheduling
scheduleMemePosts()

console.log('Bot is running...')
