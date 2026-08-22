// js/supabase.js
const SUPABASE_URL = 'https://hzttfksnjvfauyhgvnxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6dHRma3NuanZmYXV5aGd2bnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNTgzNDAsImV4cCI6MjEwMjkzNDM0MH0.6P6cY8qaFChgo6N23Xld5JiRcuuSgdCU22TIiO0IKlk';

// The CDN exposes a global called "supabase"
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);