// Simple script to examine the database schema
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function examineSchema() {
  try {
    console.log('Examining database schema...');
    
    // Use raw SQL to query information_schema
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'quiz_participants'
    });
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Quiz Participants table columns:', data);
  } catch (error) {
    console.error('Error examining schema:', error);
  }
}

examineSchema(); 