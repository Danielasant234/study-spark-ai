import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rynticvuqejbqeubllbv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bnRpY3Z1cWVqYnFldWJsbGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjc0OTUsImV4cCI6MjA4OTgwMzQ5NX0.ssAANepANdbCk7AQhT27n99t47ijzroDPZKDa_aTIp8'
);

const emptyUUID = '00000000-0000-0000-0000-000000000000';

async function clearDB() {
  console.log('Limpando flashcards...');
  let res = await supabase.from('flashcards').delete().neq('id', emptyUUID);
  if (res.error) console.error('Flashcards error:', res.error);
  
  console.log('Limpando generated_materials...');
  res = await supabase.from('generated_materials').delete().neq('id', emptyUUID);
  if (res.error) console.error('Materials error:', res.error);
  
  console.log('Limpando review_sessions...');
  res = await supabase.from('review_sessions').delete().neq('id', emptyUUID);
  if (res.error) console.error('Sessions error:', res.error);
  
  console.log('Limpando conversations...');
  res = await supabase.from('conversations').delete().neq('id', emptyUUID);
  if (res.error) console.error('Conversations error:', res.error);
  
  console.log('Banco de dados limpo com sucesso!');
}

clearDB().catch(console.error);
