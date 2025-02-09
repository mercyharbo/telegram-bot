import dotenv from 'dotenv'
import fetch from 'node-fetch'
import TelegramBot from 'node-telegram-bot-api'

dotenv.config()

const token = process.env.BOT_TOKEN
const rapid_api_key = process.env.RAPID_API_KEY

const TELEGRAM_CHANNEL_USERNAME = '@codewithmercy1'

const bot = new TelegramBot(token, { polling: false })

const API_URL =
  'https://programming-challenges.p.rapidapi.com/api/ziza/programming-challenges/get/single/1'
const API_HEADERS = {
  'x-rapidapi-key': rapid_api_key,
  'x-rapidapi-host': 'programming-challenges.p.rapidapi.com',
}

// Function to fetch a random challenge
const fetchChallenge = async () => {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: API_HEADERS,
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching challenge:', error)
    return null
  }
}

// Function to post challenge to Telegram
const postChallenge = async () => {
  const challenge = await fetchChallenge()
  if (!challenge) return

  const message =
    `🤖 *Programming Challenge* 🤖\n\n` +
    `📌 *Challenge:* ${challenge.Challenge}\n` +
    `📖 *Description:* ${challenge.description}\n` +
    `⚡ *Difficulty:* ${challenge.difficulty}\n\n` +
    `📝 *Example Input:* \`${challenge.testCases[0].input}\`\n` +
    `❓ *Find the solution!*\n\n` +
    `⏳ The answer will be posted in 2 hours!`

  bot.sendMessage(TELEGRAM_CHANNEL_USERNAME, message, {
    parse_mode: 'Markdown',
  })

  // Schedule the solution posting after 2 hours
  setTimeout(() => postSolution(challenge), 2 * 60 * 60 * 1000) // 2 hours in milliseconds
}

// Function to post the solution
const postSolution = async (challenge) => {
  const solutionJS =
    challenge.solution.find((sol) => sol.javascript)?.javascript ||
    'Solution not available'

  const message =
    `✅ *Solution for:* ${challenge.Challenge}\n\n` +
    `📝 *Example Input:* \`${challenge.testCases[0].input}\`\n` +
    `🔹 *Expected Output:* \`${challenge.testCases[0].output}\`\n\n` +
    `💻 *JavaScript Solution:*\n` +
    `\`\`\`javascript\n${solutionJS}\n\`\`\``

  bot.sendMessage(TELEGRAM_CHANNEL_USERNAME, message, {
    parse_mode: 'Markdown',
  })
}

// Function to start scheduling challenge posts using cron
export const scheduleChallengePosts = () => {
  // Run immediately on start
  postChallenge()

  //   Optional: Schedule every 2 hours later
  cron.schedule('0 */2 * * *', () => {
    console.log('Running scheduled challenge post...')
    postChallenge()
  })
}
