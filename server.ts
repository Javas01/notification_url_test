import express from 'express'
import queryString from 'query-string'
import fetch from 'node-fetch';

import { RefreshTokenResponse } from './serverTypes'

const app = express()
const port = process.env.PORT || 8080

let application_token: string = ''
let refresh_token: string = ''
let requestContextId: string = ''
const commonHeaders = {
  Accept: 'application/json',
  Authorization: `Bearer ${application_token}`,
  'Content-Type': 'application/json',
  RequestContextId: requestContextId
}

const getAppToken = async (refetch = false) => {
  if (!refetch && application_token) {
    return application_token
  }

  try {
    const params = {
      client_id: 'mobileApp',
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'client_credentials',
      response_type: 'id_token+token',
      scope: 'WebAPI'
    }

    const response = await fetch('https://api.pnf.com/identity/connect/token', {
      body: queryString.stringify(params),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST'
    }).catch((e) => console.log(e))

    const json = (await response?.json()) as RefreshTokenResponse
    requestContextId = response?.headers.get('RequestContextId') ?? ''
    application_token = json.access_token
    refresh_token = json.refresh_token

    return application_token
  } catch (e) {
    console.log(e)
  }
}

const refreshToken = async () => {
  await getAppToken(true)

  try {
    const params = {
      clientId: 'mobileAppUser',
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: refresh_token
    }

    const response = await fetch(
      'https://api.pnf.com/identity/api/Identity/refreshaccesstoken/',
      {
        body: JSON.stringify(params),
        headers: commonHeaders,
        method: 'POST'
      }
    )

    const json = (await response.json()) as RefreshTokenResponse

    if (json.access_token) {
      application_token = json.access_token
      refresh_token = json.refresh_token
      return true // Refreshed token successfully
    } else {
      throw new Error('No access token found')
    }
  } catch (e) {
    console.log(e)
    return false
  }
}

app.get('/', async (req, res) => {
  console.log(req.query)
  const { sessionId } = req.query
  console.log('session ID: ', sessionId)

  try {
    const response = await fetch(
      `https://uat.windcave.com/api/v1/sessions/${sessionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${process.env.TOKEN}`
        }
      }
    )
    const data: any = await response.json()
    console.log('meta data', data)
    console.log('meta data', data.metaData)

    res.sendStatus(200)
  } catch (error) {
    console.log(error)

    res.sendStatus(200)
  }
})

app.post('/', (req, res) => {
  console.log('query: ', req.query)
  console.log('body: ', req.body)
})

app.listen(port, async () => {
  const token = await getAppToken()
  console.log(`App token: ${token}`)
})
