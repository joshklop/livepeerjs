import { parse as parsePath } from 'path'
import { parse as parseQS } from 'querystring'
import { parse as parseUrl } from 'url'
import { authMiddleware } from '../middleware'
import { validatePost } from '../middleware'
import { Router } from 'express'
import logger from '../logger'
import uuid from 'uuid/v4'
import wowzaHydrate from './wowza-hydrate'
import path from 'path'

const app = Router()

app.get('/', authMiddleware({ admin: true }), async (req, res) => {
  let limit = req.query.limit
  let cursor = req.query.cursor
  logger.info(`cursor params ${req.query.cursor}, limit ${limit}`)

  const resp = await req.store.list(`broadcasters/`, cursor, limit)
  let output = resp.data
  const nextCursor = resp.cursor
  res.status(200)

  if (output.length > 0) {
    res.links({ next: makeNextHREF(req, nextCursor) })
  }
  output = output.map(x => ({
    ...x,
    credentials: null,
  }))

  res.json(output)
})

app.get('/:id', authMiddleware({}), async (req, res) => {
  const { id } = req.params
  const broadcaster = await req.store.get(`broadcasters/${id}`)
  if (broadcaster) {
    res.status(200)
    res.json(broadcaster)
  } else {
    res.status(200)
    res.json({})
  }
})

app.post(
  '/',
  authMiddleware({}),
  validatePost('broadcasters'),
  async (req, res) => {
    const id = uuid()

    await req.store.create({
      id: id,
      address: req.body.address,
      kind: `broadcasters`,
    })
    const broadcaster = await req.store.get(`broadcasters/${id}`)

    if (broadcaster) {
      res.status(201)
      res.json(broadcaster)
    } else {
      res.status(403)
      res.json({})
    }
  },
)

function makeNextHREF(req, nextCursor) {
  let baseUrl = new URL(
    `${req.protocol}://${req.get('host')}${req.originalUrl}`,
  )
  let next = baseUrl
  next.searchParams.set('cursor', nextCursor)
  return next.href
}

export default app