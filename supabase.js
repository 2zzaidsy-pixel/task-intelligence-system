const SUPABASE_CONFIG = {
  url: 'https://ojxfeepwuyrwtnegjkzn.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeGZlZXB3dXlyd3RuZWdqa3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDA3MDksImV4cCI6MjA5Njc3NjcwOX0.EGqrXF2wiIlZHVabSuy5kJdnnYFa3B8x8Uff4bjnAyw'
};

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
