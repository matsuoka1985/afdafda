export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  console.log('Environment variables:')
  console.log('GITHUB_TOKEN:', config.GITHUB_TOKEN ? 'SET' : 'NOT SET')
  console.log('GITHUB_OWNER:', config.GITHUB_OWNER)
  console.log('GITHUB_REPO:', config.GITHUB_REPO)
  
  return {
    config: {
      GITHUB_TOKEN: config.GITHUB_TOKEN ? 'SET' : 'NOT SET',
      GITHUB_OWNER: config.GITHUB_OWNER,
      GITHUB_REPO: config.GITHUB_REPO,
    }
  }
})