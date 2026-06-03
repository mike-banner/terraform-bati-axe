export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  return {
    supabase: config.public.supabase
  }
})
