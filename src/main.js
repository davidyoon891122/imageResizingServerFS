// @ts-check
require('dotenv').config()
// const fs = require('fs')
const http = require('http')
const { createApi } = require('unsplash-js')
const { default: fetch } = require('node-fetch')

const unsplash = createApi({
  accessKey: process.env.UNSPLASH_API_ACCESS_KEY,
  // @ts-ignore
  fetch,
})

/**
 *
 * @param {string} query
 */

async function searchImage(query) {
  const result = await unsplash.search.getPhotos({ query })

  if (!result.response) {
    throw new Error('Failed to search image.')
  }

  const image = result.response.results[0]

  if (!image) {
    throw new Error('No image found.')
  }

  return {
    description: image.description || image.alt_description,
    url: image.urls.regular,
  }
}

const server = http.createServer((req, res) => {
  async function main() {
    const result = await searchImage('mountain')
    const resp = await fetch(result.url) // Todo: What is the fetch
    resp.body.pipe(res)
  }

  main()
})

const PORT = 5005

server.listen(PORT, () => {
  console.log(`The server is listening at port ${PORT}`)
})
