require('dotenv').config();
const express = require('express');
const router = express.Router();
const axios = require('axios');
const math = require('mathjs');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const { GoogleGenerativeAI } = require('@google/generative-ai');
// const yahooFinanceAPI = require('yahoo-finance');
// const alphaVantage = require('alpha-vantage-cli').default;

const stockCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 }); // Cache for 1 hour

// Rate limiter middleware
const apiLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 483, // limit each IP to 500 requests per day
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware to parse JSON bodies
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Root route
router.get('/', (req, res) => {

    res.send('Root Api route');
} );


// rapidApi get historical data
router.get('/getHistoricalData', async(req, res) => {
  const options = {
    method: 'GET',
    url: 'https://alpha-vantage.p.rapidapi.com/query',
    params: {
      function: 'TIME_SERIES_DAILY_ADJUSTED',
      symbol: 'MSFT',
      outputsize: 'compact',
      datatype: 'json'
    },
    headers: {
      'X-RapidAPI-Key': '11283c37e4msh597fababfab514bp1832f8jsn0cb154368cf0',
      'X-RapidAPI-Host': 'alpha-vantage.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    res.json(response.data);
  } catch (error) {
    console.error(error);
  }


})


// getting real time data ??
// const getRealData = async (symbol) => {
//   const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=T&apikey=${process.env.ALPHA_VANTAGE_KEY}`;
//   try {
//     // const response = await axios.get(url);
//     return response.data;

//   } catch (error) {
//     console.error('Error cant get real data', error);
//     console.log(error);
//   }
// };

// router.get( '/getRealData' , async(req, res) => {

//   try {
//     const {symbol} = req.params
//     const realData = await getRealData();
//     res.json(realData);
//     console.log(realData);
//   } catch (error) {
//     console.error(`Error getting real data ${error}`);
//     console.log(`real data ${error}`);
//   }
  
// });


// Getting Stocks historical data in mins. 60mins MAX
    
const getStockDataMin = async (symbol) => {
    // const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY/${symbol}/${interval}min/apikey=${process.env.ALPHA_VANTAGE_KEY}`;
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}apikey=${process.env.ALPHA_VANTAGE_KEY}`;
    // https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=COIN,CRYPTO:BTC,FOREX:USD&time_from=20220410T0130&limit=1000&apikey=demo
    
    try {
      const response = await axios.get(url);
      return response.data; // The API response data

    } catch (error) {
      console.error('Error fetching data from Alpha Vantage:', error);
    }
  };


router.get(`/testA/:symbol`, async(req,res) => {
    // console.log("mins " + req.params.symbol)
    try {
        const { symbol } = req.params
        const stockData = await getStockDataMin(symbol);
        res.json(stockData);
    } catch (error) {
        res.status(500).send('Failed to fetch stock data');
    }
})

// Getting Stocks historical using polgon data that goes back years
const getStockDataYrs = async (symbol, multiplier, timespan, from, to) => {
    // const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?apiKey=${process.env.POLYGON_KEY}`;
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?apiKey=${process.env.POLYGON_KEY}`;
    try {
        const response = await axios.get(url);
        return response.data; // The API response data
      } catch (error) {
        console.log('Error fetching data from polygon:', error);
      }
};

// connection to python 
router.get(`/v2/aggs/ticker/:stocksTicker/range/:multiplier/:timespan/:from/:to`, async(req, res) => {
    
    try {
        const { stocksTicker, multiplier, timespan, from, to } = req.params;
        // console.log(' user input  '+ req.params.stocksTicker, req.params.from, req.params.to, req.params.multiplier, req.params.timespan)
        const stockData = await getStockDataYrs(stocksTicker, multiplier, timespan, from, to);

        if (!stockData || !stockData.results) {
          throw new Error("Invalid stock data");
      }

        // Integrating LSTM and PROPHET Models
         // Perform POST request to Python backend for LSTM prediction
          const lstmResponse = await axios.post('http://localhost:5000/predict', { historicalPrices: stockData.results.map(item => ({ 
                close: item.c, open: item.o, high: item.h, low: item.l, volume: item.v
        }))});
        //  [Index(['open', 'high', 'low', 'volume']

        //  // Perform POST request to Python backend for Prophet prediction
        //  const prophetResponse = await axios.post('http://localhost:5000/predict-prophet', { historicalPrices: stockData.results.map(item => item.c) });

        res.json({
          historicalData: stockData,
          lstmPrediction: lstmResponse.data
          // prophetPrediction: prophetResponse.data.futurePrices
      });
    } catch (error) {
      console.error('Error fetching stock data', error);
      res.status(500).send('Failed to fetch stock data: ' + error.message);
  }
});


// Route for GBM simulation
// GBM function:
// Function to estimate parameters and simulate future prices
const simulateGBM = (historicalPrices) => {
  if (historicalPrices.length < 2) {
    console.error("Not enough data to simulate future prices.");
    return [];
  }

  const returns = historicalPrices.map((price, index) => {
    if (index === 0) return 0; // Skip the first one
    return Math.log(price / historicalPrices[index - 1]);
  }).slice(1);

  const mu = math.mean(returns);
  const sigma = math.std(returns);
  const S0 = historicalPrices[historicalPrices.length - 1];
  const dt = 1; // daily simulation
  const futureDays = 60;
  let S = S0;
  let futurePrices = [];

  function randomNormal(mu = 0, sigma = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    let standardNormal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mu + sigma * standardNormal;
  }

  for (let i = 0; i < futureDays; i++) {
    let W = randomNormal() * Math.sqrt(dt);
    S = S * Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * W);
    futurePrices.push(S);
  }

  return futurePrices;
};


router.get(`/v2/simulate-gbm/:stocksTicker/range/:multiplier/:timespan/:from/:to`, async(req, res)=> {

  try {
    const { stocksTicker, multiplier, timespan, from, to } = req.params;
    const stockData = await getStockDataYrs(stocksTicker, multiplier, timespan, from, to);
    const historicalPrices = stockData.results.map(data => data.c); // Use closing prices

    // use the GBM function to get the perdicted stock numbers
    const futurePrices = simulateGBM(historicalPrices);

    res.json({futurePrices});
    // res.json(historicalPrices);

  } catch (error) {
    res.status(500).send(error.message + " failed to gbm");
  }

});


// Integrating OpenAI chatgpt model ===> that is the data model
const OpenAiAPIKey = process.env.OPENAI_API_KEY
const openAiURL = 'https://api.openai.com/v1/chat/completions';

const chatGPT = async (prompt) => {
  try {
    const response = await axios.post( openAiURL, {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    }, {
        headers: {
            'Authorization': `Bearer ${OpenAiAPIKey}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data.choices[0].message.content;
  } catch (error) {
      console.error('Error calling OpenAI:', error);
      throw error;
  }
}

// chatGPT route
router.post('/chat-gpt', async(req, res) => {
  const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).send('Prompt is required');
    }
    try {
        const chatResponse = await chatGPT(prompt);
        res.json({ message: chatResponse });
      } catch (error) {
        console.error('OpenAI API call error:', error.response ? error.response.data : error.message);
        res.status(500).send('Failed to fetch response from OpenAI: ' + error.message);
    }
    
})


// co-pilot
//  co-pilot model
const endpoint = "https://ai-kgergesai598385615135.openai.azure.com/";
const apiKey = process.env.AZURE_TEXT_ANALYTICS_KEY;

const client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));

async function generateChatCompletion(prompt) {
  try {
      const response = await client.getCompletions({
          model: "gpt-3.5-turbo",  // Adjust the model name as necessary
          messages: [{ role: "user", content: prompt }]
      });

      const { choices } = response;
      return choices.map(choice => choice.text).join("\n");
  } catch (error) {
      console.error("Error in generating chat completion:", error);
      throw error;
  }
}

// co-pilot router
router.post('/co-pilot', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
      return res.status(400).send("Prompt is required.");
  }

  try {
      const completion = await generateChatCompletion(prompt);
      res.send({ response: completion });
  } catch (error) {
      res.status(500).send("Failed to generate chat completion.");
  }
});

// Gemini
// Gemini model
const genAiApi = process.env.GEMINI_API_KEY;
const genAi = new GoogleGenerativeAI(genAiApi);
async function generateChatFromUser (prompt) {

  const model = genAi.getGenerativeModel({ model: "gemini-pro" })
  const result = await model.generateContent(prompt);
  const response = await result.response;

  return response;
  
}

// Gemini router
router.post('/gemini', async(req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).send("Prompt is required.");
  }

  try {
    const completion = await generateChatFromUser(prompt);
    res.send({ response: completion });
  } catch (error) {
    res.status(500).send("Failed to generate chat from gemini.");
  }

});

// Yahoo Finance chatbot
// middle ware
router.use('/stockChatBot', apiLimiter);
router.use('/finbot', apiLimiter);

// Stock recommendations( buy, hold, sell %)
router.post(`/stockChatBot/:stock`, async(req, res) => {

  const { stock } = req.params;

  // Check if the stock data is in the cache
  // const cachedData = stockCache.get(stock);
  // if (cachedData) {
  //   return res.json(cachedData);
  // }

  const options = {
    method: 'POST',
    url: 'https://yahoo-finance160.p.rapidapi.com/recommnedations',
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': process.env.RapidAPI_API_KEY,
      'X-RapidAPI-Host': 'yahoo-finance160.p.rapidapi.com'
    },
    data: {stock: stock}
  };

  try {
    const response = await axios.request(options);
    // Cache the response data
    // stockCache.set(stock, response.data);
    res.json(response.data);
    // console.log(response.data);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching stock analysis' + error.message });
    console.log(`chatbot err ${error}`)
  }
});

// chatbot that can give recommendations as well
router.post(`/finbot/:stock/:message`, async(req, res) => {
    const { stock, message } = req.params;

    // Debugging: Log the received request params
    // console.log('Request params:', req.params);

    if (!stock || typeof stock !== 'string') {
      return res.status(400).json({ error: 'Invalid stock identifier' });
    };

    // Check if the stock data is in the cache
    const cachedData = stockCache.get(stock);
    if (cachedData) {
      return res.json(cachedData);
    }

    const options = {
      method: 'POST',
      url: 'https://yahoo-finance160.p.rapidapi.com/finbot',
      headers: {
        'content-type': 'application/json',
        'X-RapidAPI-Key': process.env.RapidAPI_API_KEY,
        'X-RapidAPI-Host': 'yahoo-finance160.p.rapidapi.com'
      },
      data: {
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        stock: stock,
        conversation_id: '',
        period: '1mo'
      }
      };

    try {
      const response = await axios.request(options);
      // Cache the response data
      stockCache.set(stock, response.data);
      res.json(response.data);
      console.log(response.data);
    } catch (error) {
      res.status(500).json({ error: 'An error occurred while fetching stock analysis' + error.message });
      console.log(`chatbot err ${error}`)
    }
});

// Stock news per stock
router.post('/stockNews/:stock', async (req, res) => {
  const {stock}  = req.params;

// check if there is stock and if its a string
  if (!stock || typeof stock !== 'string') {
    return res.status(400).json({ error: 'Invalid stock identifier' });
  };

// Check if the stock data is in the cache
  const cachedData = stockCache.get(stock);
  if (cachedData) {
    return res.json(cachedData);
  };

  const options = {
    method: 'POST',
    url: 'https://yahoo-finance160.p.rapidapi.com/stocknews',
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': process.env.RapidAPI_API_KEY,
      'X-RapidAPI-Host': 'yahoo-finance160.p.rapidapi.com'
    },
    data: {stock: stock}
  };
  
  try {
    const response = await axios.request(options);
    // Cache the response data
    stockCache.set(stock, response.data);
    res.json(response.data);
    console.log(response.data);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching stock analysis' + error.message });
    console.log(`chatbot err ${error}`)
  }

});

// Stock news most active
router.get('/mostActive', async (req, res) => {

  const options = {
    method: 'GET',
    url: 'https://real-time-finance-data.p.rapidapi.com/market-trends',
    params: {
      trend_type: 'MOST_ACTIVE',
      country: 'us',
      language: 'en'
    },
    headers: {
      'X-RapidAPI-Key': '11283c37e4msh597fababfab514bp1832f8jsn0cb154368cf0',
      'X-RapidAPI-Host': 'real-time-finance-data.p.rapidapi.com'
    }
  };
  
  try {
    const response = await axios.request(options);
    // Cache the response data
    stockCache.set(response.data);
    res.json(response.data);
    console.log(response.data);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching stock analysis' + error.message });
    console.log(`stock news err ${error.message}`)
  }

});


module.exports = router;