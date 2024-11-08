# Stock Analysis API

"""
This is a RESTful API built with Node.js and Express.js. It provides endpoints for stock analysis, news, and recommendations. 
The API fetches stock data using various external services, including Alpha Vantage, Polygon, and Yahoo Finance.
"""

## Endpoints

1. **Stock News**
   - `GET /mostActive`: Returns the most active stocks in the US market.
   - `POST /stockNews/:stock`: Returns news articles for a specific stock.

2. **Stock Analysis**
   - `GET /v2/aggs/ticker/:stocksTicker/range/:multiplier/:timespan/:from/:to`: Returns historical stock data for a specific ticker.
   - `POST /finbot/:stock/:message`: Returns a recommendation for a specific stock based on a user's message.

3. **Chatbot**
   - `POST /co-pilot`: Returns a response from a chatbot based on a user's prompt.

## Cache

"""
The API uses a cache to store frequently accessed data, reducing the number of requests to external services.
The cache is implemented using Node Cache.
"""

## Dependencies

- `express`: ^4.17.1
- `axios`: ^0.21.1
- `mathjs`: ^9.4.4
- `node-cache`: ^5.1.2
- `@azure/openai`: ^1.0.0
- `@google/generative-ai`: ^1.0.0

## Environment Variables

- `ALPHA_VANTAGE_KEY`: Alpha Vantage API key (string)
- `POLYGON_KEY`: Polygon API key (string)
- `RapidAPI_API_KEY`: RapidAPI key for Yahoo Finance (string)
- `OpenAiAPIKey`: OpenAI API key (string)
- `GEMINI_API_KEY`: Gemini API key (string)

## Usage

"""
Clone the repository and follow these steps to set up the API:
1. Install dependencies: `npm install`
2. Set environment variables: `cp .env.example .env` and update the values
3. Start the server: `npm start`
4. Use a tool like Postman or cURL to test the endpoints
"""

## License

"""
This project is licensed under the MIT License. See LICENSE for details.
"""