// tests/routes.test.js
require('dotenv').config();

const request = require('supertest');
const express = require('express');
const router = require('../routes/api/v1/index'); // Update with the correct path to your router file

const app = express();
app.use(express.json());
app.use('/', router);

describe('API Routes', () => {
  // Root Route
  it('GET / should return Root Api route', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toBe('Root Api route');
  });

  // Historical Data Route
  it('GET /getHistoricalData should return historical data', async () => {
    const res = await request(app).get('/getHistoricalData');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('Meta Data');
  });

  // Test A Route
  it('GET /testA/:symbol should return stock data', async () => {
    const res = await request(app).get('/testA/MSFT');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('Meta Data');
  });

  // Stock Data by Range Route
  it('GET /v2/aggs/ticker/:stocksTicker/range/:multiplier/:timespan/:from/:to should return stock data by range', async () => {
    const res = await request(app).get('/v2/aggs/ticker/MSFT/range/1/day/2020-01-01/2021-01-01');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('historicalData');
  });

  // Simulate GBM Route
  it('GET /v2/simulate-gbm/:stocksTicker/range/:multiplier/:timespan/:from/:to should return simulated GBM data', async () => {
    const res = await request(app).get('/v2/simulate-gbm/MSFT/range/1/day/2020-01-01/2021-01-01');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('futurePrices');
  });

  // Chat GPT Route
//   it('POST /chat-gpt should return chat GPT response', async () => {
//     const res = await request(app).post('/chat-gpt').send({ prompt: 'Hello, how are you?' });
//     expect(res.statusCode).toEqual(200);
//     expect(res.body).toHaveProperty('message');
//   });

  // Co-Pilot Route
//   it('POST /co-pilot should return co-pilot response', async () => {
//     const res = await request(app).post('/co-pilot').send({ prompt: 'Help me with this code.' });
//     expect(res.statusCode).toEqual(200);
//     expect(res.body).toHaveProperty('response');
//   });

  // Gemini Route
  it('POST /gemini should return gemini response', async () => {
    const res = await request(app).post('/gemini').send({ prompt: 'What is the stock market?' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('response');
  });

  // Stock Recommendations Route
  it('POST /stockChatBot/:stock should return stock recommendations', async () => {
    const res = await request(app).post('/stockChatBot/MSFT');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('recommendation');
  });

  // Finbot Route
  it('POST /finbot/:stock/:message should return finbot response', async () => {
    const res = await request(app).post('/finbot/MSFT/Should I buy this stock?');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('response');
  });

  // Stock News Route
  it('POST /stockNews/:stock should return stock news', async () => {
    const res = await request(app).post('/stockNews/MSFT');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('news');
  });

//   // Most Active Stocks Route
//   it('GET /mostActive should return most active stocks', async () => {
//     const res = await request(app).get('/mostActive');
//     expect(res.statusCode).toEqual(200);
//     expect(res.body).toHaveProperty('mostActive');
//   });
});
