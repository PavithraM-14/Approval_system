import '@testing-library/jest-dom'

// Polyfill for TextEncoder/TextDecoder (required by MongoDB/Mongoose)
const { TextEncoder, TextDecoder } = require('util')

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
