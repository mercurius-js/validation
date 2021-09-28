'use strict'

const autocannon = require('autocannon')

const query = `query {
  message(id: "1") {
    id
    text
  }
  messages(
    filters: { text: "hello"}
    nestedFilters: { input: { text: "hello"} }
    arrayScalarFilters: ["hello"]
    arrayObjectFilters: [{ filters: { text: "hello" }}]
  ) {
    id
    text
  }
}`

const instance = autocannon(
  {
    url: 'http://localhost:3000/graphql',
    connections: 100,
    title: '',
    method: 'POST',
    headers: {
      'content-type': 'application/json', 'x-user': 'admin'
    },
    body: JSON.stringify({ query })
  },
  (err) => {
    if (err) {
      console.error(err)
    }
  }
)

process.once('SIGINT', () => {
  instance.stop()
})

autocannon.track(instance, { renderProgressBar: true })
