export default defineNitroPlugin(() => {
  console.log('[disable-proxy] Cleaning up proxy environment variables...')
  delete process.env.HTTP_PROXY
  delete process.env.HTTPS_PROXY
  delete process.env.ALL_PROXY
  process.env.NO_PROXY = 'localhost,127.0.0.1'
  console.log('[disable-proxy] Proxy cleanup complete')
})