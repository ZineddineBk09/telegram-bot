import { Bot, Context, InlineKeyboard } from 'grammy'
import 'dotenv/config'
import { CryptoCurrency } from './interfaces'
import { handleWelcome, welcomeMenu } from './handlers/welcome-handler'
import { handleLatestNews } from './handlers/latest-news-handler'
import { handleLatestNewsByCategory } from './handlers/latest-news-category-handler'

// Create an instance of the `Bot` class and pass your bot token to it.
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || '') // <-- put your bot token between the ""

// ------------------ Start ------------------
bot.command('start', handleWelcome)

// ------------------ Help ------------------
bot.on('message', async (ctx: Context) => {
  await ctx.reply('I am sorry, I do not understand.')
  // display the welcome menu
  await ctx.reply('Please select an option from below.', {
    reply_markup: welcomeMenu,
  })
})

// ------------------ Latest News ------------------
bot.callbackQuery('latest_news', handleLatestNews)

// ------------------ Latest News by Category ------------------
const latestNewsByCategoryRegex = /latest_news_by_category(.*)/
bot.callbackQuery(latestNewsByCategoryRegex, handleLatestNewsByCategory)

// ------------------ Security News ------------------
bot.callbackQuery('security_news', async (ctx: Context) => {
  console.log('security_news')
  // get the data from the response
  const data = await getLatestNews('http://localhost:3000/api/security-news')
  if (data.length == 0) {
    await ctx.reply(
      'Coingecko Exceeded the Rate Limit. Please try again later in 1 minute.'
    )
    return
  }
  // loop through the data
  for (let i = 0; i < data.length; i++) {
    // add the title and the link to the string
    await ctx.reply(data[i].pageUrl)
  }

  await ctx.reply('Latest News on Cointelegraph', {
    reply_markup: await newsCategoryMenu,
  })
})

let cryptoPrices: CryptoCurrency[] = [] as CryptoCurrency[]
let currentPage = 1
let currency = 'usd'
let counter = 60
const pageSize = 10

const paginationKeyboard = new InlineKeyboard()
  .text('Previous', 'previous')
  .text('Next', 'next')
  .row()
  .text('Back to Main Menu', 'back_to_main_menu')

bot.callbackQuery('previous', async (ctx: Context) => {
  console.log('previous:', currentPage, ' - ', currency)
  currentPage == 1 ? (currentPage = 1) : (currentPage -= 1)
  cryptoPrices = await getLatestCryptoPrices(currency)

  // handle coingecko exceeded the rate limit error => data=[]
  if (cryptoPrices.length == 0) {
    await ctx.reply(
      'Coingecko API Exceeded the Rate Limit. Please try again later in 1 minute.'
    )
    counter != 60 && counter != 0 ? null : (counter = 60)
    // display a counter to the user
    const interval = setInterval(async () => {
      counter--
      //replace the message with the new counter
      await ctx.editMessageText('Please try again in ' + counter + ' seconds.')

      if (counter === 0) {
        clearInterval(interval)
        counter = 60
      }
    }, 1000)
    return
  }

  const prices = cryptoPrices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )
  // display each currency as a button
  const currencies = new InlineKeyboard()

  const displayCurrency =
    currency.toUpperCase() === 'USD'
      ? '$'
      : currency.toUpperCase() === 'EUR'
      ? '€'
      : currency.toUpperCase() === 'BTC'
      ? '₿'
      : 'ETH'
  // loop through the data
  for (let i = 0; i < prices.length; i++) {
    const {
      name,
      current_price,
      market_cap_rank,
      price_change_percentage_24h,
      symbol,
    } = prices[i]
    const price_change_percentage_24h_string =
      price_change_percentage_24h > 0
        ? `${market_cap_rank} - ${name} (${symbol.toUpperCase()}) ${displayCurrency}${current_price} (24H: +${price_change_percentage_24h}%)`
        : `${market_cap_rank} - ${name} (${symbol.toUpperCase()}) ${displayCurrency}${current_price} (24H: ${price_change_percentage_24h}%)`

    // add the title and the link to the string
    currencies
      .text(
        price_change_percentage_24h_string,
        'currency_' + name.toLowerCase()
      )
      .row()
  }

  currencies
    .row()
    .text('Back to Main Menu', 'back_to_main_menu')
    .row()
    .text('Previous', 'previous')
    .text('Next', 'next')

  if (currentPage == 1) {
    await ctx.reply('Choose a Currency', {
      reply_markup: currencies,
      parse_mode: 'HTML',
    })
  } else {
    await ctx.editMessageText('Choose a Currency', {
      reply_markup: currencies,
      parse_mode: 'HTML',
    })
  }
})

bot.callbackQuery('next', async (ctx: Context) => {
  console.log('next:', currentPage, ' - ', currency)
  console.log(cryptoPrices.length / pageSize)
  currentPage == cryptoPrices.length / pageSize
    ? (currentPage = 1)
    : (currentPage += 1)
  cryptoPrices = await getLatestCryptoPrices(currency)

  // handle coingecko exceeded the rate limit error => data=[]
  if (cryptoPrices.length == 0) {
    await ctx.reply(
      'Coingecko Exceeded the Rate Limit. Please try again later in 1 minute.'
    )
    counter != 60 && counter != 0 ? null : (counter = 60)
    // display a counter to the user
    const interval = setInterval(async () => {
      counter--
      await ctx.editMessageText('Please try again in ' + counter + ' seconds.')
      if (counter == 0) {
        clearInterval(interval)
        counter = 60
      }
    }, 1000)
    return
  }

  const prices = cryptoPrices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )
  // display each currency as a button
  const currencies = new InlineKeyboard()

  const displayCurrency =
    currency.toUpperCase() === 'USD'
      ? '$'
      : currency.toUpperCase() === 'EUR'
      ? '€'
      : currency.toUpperCase() === 'BTC'
      ? '₿'
      : 'ETH'
  // loop through the data
  for (let i = 0; i < prices.length; i++) {
    const {
      name,
      current_price,
      market_cap_rank,
      price_change_percentage_24h,
      symbol,
    } = prices[i]
    const price_change_percentage_24h_string =
      price_change_percentage_24h > 0
        ? `${market_cap_rank} - ${name} (${symbol.toUpperCase()}) ${displayCurrency}${current_price} (24H: +${price_change_percentage_24h}%)`
        : `${market_cap_rank} - ${name} (${symbol.toUpperCase()}) ${displayCurrency}${current_price} (24H: ${price_change_percentage_24h}%)`

    // add the title and the link to the string
    currencies
      .text(
        price_change_percentage_24h_string,
        'currency_' + name.toLowerCase()
      )
      .row()
  }

  currencies
    .row()
    .text('Back to Main Menu', 'back_to_main_menu')
    .row()
    .text('Previous', 'previous')
    .text('Next', 'next')

  await ctx.editMessageText('Choose a Currency', {
    reply_markup: currencies,
    parse_mode: 'HTML',
  })
})

bot.callbackQuery('crypto_prices', async (ctx: Context) => {
  console.log('crypto_prices')
  // display cryptoPricesVsCurrencyMenu
  await ctx.editMessageText('Choose the Base Currency', {
    reply_markup: cryptoPricesVsCurrencyMenu,
  })
})

const cryptoPricesVsCurrencyMenu = new InlineKeyboard()
  .text('USD', 'crypto_prices_vs_usd')
  .text('EUR', 'crypto_prices_vs_eur')
  .text('BTC', 'crypto_prices_vs_btc')
  .text('ETH', 'crypto_prices_vs_eth')
  .row()
  .text('Back to Main Menu', 'back_to_main_menu')
const cryptoPricesVsCurrencyMenuRegex = /crypto_prices_vs_(.*)/
bot.callbackQuery(cryptoPricesVsCurrencyMenuRegex, async (ctx: Context) => {
  console.log('crypto_prices_vs_usd')
  currency = ctx.callbackQuery!.data!.replace('crypto_prices_vs_', '') || 'usd'
  cryptoPrices = await getLatestCryptoPrices(currency)

  // handle coingecko exceeded the rate limit error => data=[]
  if (cryptoPrices.length == 0) {
    await ctx.reply(
      'Coingecko Exceeded the Rate Limit. Please try again later in 1 minute.'
    )
    counter != 60 && counter != 0 ? null : (counter = 60)
    // display a counter to the user
    const interval = setInterval(() => {
      counter--
      ctx.editMessageText('Please try again in ' + counter + ' seconds.')
      if (counter == 0) {
        clearInterval(interval)
        counter = 60
      }
    }, 1000)

    return
  }

  const prices = cryptoPrices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // display each currency as a button
  const currencies = new InlineKeyboard()

  const displayCurrency =
    currency.toUpperCase() === 'USD'
      ? '$'
      : currency.toUpperCase() === 'EUR'
      ? '€'
      : currency.toUpperCase() === 'BTC'
      ? '₿'
      : 'ETH'
  // loop through the data
  for (let i = 0; i < prices.length; i++) {
    const {
      name,
      current_price,
      market_cap_rank,
      price_change_percentage_24h,
      symbol,
    } = prices[i]
    const price_change_percentage_24h_string =
      price_change_percentage_24h > 0
        ? `${market_cap_rank} - ${name} (${symbol.toUpperCase()}) ${displayCurrency}${current_price} (24H: +${price_change_percentage_24h}%)`
        : `${market_cap_rank} - ${name} (${symbol.toUpperCase()}) ${displayCurrency}${current_price} (24H: ${price_change_percentage_24h}%)`

    // add the title and the link to the string
    currencies
      .text(
        price_change_percentage_24h_string,
        'currency_' + name.toLowerCase()
      )
      .row()
  }

  currencies
    .row()
    .text('Back to Main Menu', 'back_to_main_menu')
    .row()
    .text('Previous', 'previous')
    .text('Next', 'next')

  await ctx.editMessageText('Choose a Currency', {
    reply_markup: currencies,
    parse_mode: 'HTML',
  })
})

const currencyRegex = /currency_(.*)/
bot.callbackQuery(currencyRegex, async (ctx: Context) => {
  // Display full info about the currency
  const currency = ctx.callbackQuery!.data!.replace('currency_', '') || 'usd'
  const data = await getCurrencyInfos(currency)

  // handle coingecko exceeded the rate limit error => data=[]
  if (data.length == 0) {
    await ctx.reply(
      'Coingecko Exceeded the Rate Limit. Please try again later in 1 minute.'
    )
    counter != 60 && counter != 0 ? null : (counter = 60)
    // display a counter to the user
    const interval = setInterval(async () => {
      counter--
      //replace the message with the new counter
      await ctx.editMessageText('Please try again in ' + counter + ' seconds.')

      if (counter === 0) {
        clearInterval(interval)
        counter = 60
      }
    }, 1000)
    return
  }

  const {
    name,
    current_price,
    market_cap_rank,
    price_change_percentage_24h,
    symbol,
    image,
    ath,
    ath_change_percentage,
    ath_date,
    atl,
    atl_change_percentage,
    atl_date,
  } = data[0]
  const price_change_percentage_24h_string =
    price_change_percentage_24h > 0
      ? `<b>24H Change: <code>+${price_change_percentage_24h.toFixed(
          2
        )}%</code></b>`
      : `<b>24H Change: <code>${price_change_percentage_24h.toFixed(
          2
        )}%</code></b>`
  const ath_change_percentage_string =
    ath_change_percentage > 0
      ? `<b>All-Time High Change: <code>+${ath_change_percentage.toFixed(
          2
        )}%</code></b>`
      : `<b>All-Time High Change: <code>${ath_change_percentage.toFixed(
          2
        )}%</code></b>`
  const atl_change_percentage_string =
    atl_change_percentage > 0
      ? `<b>All-Time Low Change: <code>+${atl_change_percentage.toFixed(
          2
        )}%</code></b>`
      : `<b>All-Time Low Change: <code>${atl_change_percentage.toFixed(
          2
        )}%</code></b>`

  console.log(currency, ' - ', currency.toUpperCase())
  const displayCurrency =
    currency.toUpperCase() === 'USD'
      ? '$'
      : currency.toUpperCase() === 'EUR'
      ? '€'
      : currency.toUpperCase() === 'BTC'
      ? '₿'
      : 'ETH'

  const formattedMessage = `
    <b>Currency:</b> ${name} (${symbol.toUpperCase()}) 
    <b>Rank:</b> #${market_cap_rank} 
    <b>Price:</b> ${displayCurrency}${current_price.toFixed(2)}
    ${price_change_percentage_24h_string}
    ${ath_change_percentage_string}
    ${atl_change_percentage_string}
  `

  await ctx.replyWithPhoto(image, {
    caption: formattedMessage,
    parse_mode: 'HTML',
  })

  await ctx.reply('More Prices', {
    reply_markup: paginationKeyboard,
  })
})

bot.callbackQuery('back_to_main_menu', async (ctx: Context) => {
  console.log('back_to_main_menu')
  await ctx.editMessageText('Choose an Option', {
    reply_markup: welcomeMenu,
  })
})

// Start the bot
bot.start()
