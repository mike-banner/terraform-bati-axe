export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  return {
    r2AccountId: config.r2AccountId ? 'SET' : 'NOT_SET',
    r2AccountIdValue: config.r2AccountId,
    r2BucketName: config.r2BucketName
  }
})
