// Reads the files out of a .zip (stored or deflate), using the browser's own DecompressionStream.
// Enough for LinkedIn's data export; no encryption, no ZIP64.

export async function unzip(buffer, wanted = () => true) {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // End of central directory: signature 0x06054b50, searched from the end (a comment may follow it).
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('This is not a ZIP file.')
  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)
  const files = new Map()
  const decoder = new TextDecoder()
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error('The ZIP file is damaged.')
    const method = view.getUint16(p + 10, true)
    const compSize = view.getUint32(p + 20, true)
    const nameLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const commentLen = view.getUint16(p + 32, true)
    const localOffset = view.getUint32(p + 42, true)
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen))
    p += 46 + nameLen + extraLen + commentLen
    if (name.endsWith('/') || !wanted(name)) continue
    const lNameLen = view.getUint16(localOffset + 26, true)
    const lExtraLen = view.getUint16(localOffset + 28, true)
    const start = localOffset + 30 + lNameLen + lExtraLen
    const data = bytes.subarray(start, start + compSize)
    if (method === 0) files.set(name, data.slice())
    else if (method === 8) files.set(name, await inflateRaw(data))
    else throw new Error(`"${name}" uses an unsupported compression method.`)
  }
  return files
}

async function inflateRaw(data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}
