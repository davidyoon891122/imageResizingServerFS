// @ts-check
require('dotenv').config()
// const fs = require('fs')
const http = require('http')
const path = require('path')
const fs = require('fs')
const { createApi } = require('unsplash-js')
const { default: fetch } = require('node-fetch')
const { pipeline } = require('stream')
const { promisify } = require('util')
const sharp = require('sharp')

const unsplash = createApi({
  accessKey: process.env.UNSPLASH_API_ACCESS_KEY,
  // @ts-ignore
  fetch,
})

/**
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
/**
 * 이미지를 Unsplash에서 검색하거나, 이미 있다면 캐시된 이미지를 불러온다.
 * @param {string} query
 */
async function getCashedImageOrSearchedImage(query) {
  const imageFilePath = path.resolve(__dirname, `../images/${query}`)

  if (fs.existsSync(imageFilePath)) {
    return {
      message: `Returning cashed image: ${query}`,
      stream: fs.createReadStream(imageFilePath),
    }
  }

  const result = await searchImage(query)
  const response = await fetch(result.url)

  await promisify(pipeline)(response.body, fs.createWriteStream(imageFilePath))

  return {
    message: `Returning new image: ${query}`,
    stream: fs.createReadStream(imageFilePath),
  }
}

/**
 *
 * @param {string} url
 */
function convertURLToImageInfo(url) {
  const urlObj = new URL(url, 'http://localhost:5005')
  /**
   *
   * @param {string} name
   * @param {number} defaultValue
   * @returns
   */
  function getSearchParams(name, defaultValue) {
    const str = urlObj.searchParams.get(name)
    return str ? parseInt(str, 10) : defaultValue
  }

  const width = getSearchParams('width', 400)
  const height = getSearchParams('height', 400)

  return {
    query: urlObj.pathname.slice(1),
    width,
    height,
  }
}

const server = http.createServer((req, res) => {
  async function main() {
    if (!req.url || req.url.length < 2) {
      res.statusCode = 400
      res.end('Needs URL.')
      return
    }

    const { query, width, height } = await convertURLToImageInfo(req.url)
    try {
      const { message, stream } = await getCashedImageOrSearchedImage(query)
      console.log(message)
      await promisify(pipeline)(
        stream,
        sharp()
          .resize(width, height, {
            fit: 'contain',
            background: '#ffff32',
          })
          .png(),
        res
      )

      stream.pipe(res)
    } catch {
      res.statusCode = 400
      res.end()
    }
  }

  main()
})

const PORT = 5005

server.listen(PORT, () => {
  console.log(`The server is listening at port ${PORT}`)
})
