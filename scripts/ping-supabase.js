const { createClient } = require('@supabase/supabase-js');

const url = 'https://hwevzebjrzdwztjpbyeu.supabase.co';
const key = 'sb_publishable_aaNck9INPmNS6aurfDTUxQ_t20XSADU';

const supabase = createClient(url, key);

async function checkSupabase() {
  console.log('📡 Testing live connection to Supabase project...');
  try {
    const { data, error } = await supabase.from('collection_points').select('*').limit(5);
    if (error) {
      console.log('⚠️ Supabase connection active, but table query returned error:', error.message);
      console.log('👉 Make sure you ran supabase/schema.sql in the Supabase SQL Editor!');
    } else {
      console.log('🎉 SUCCESS! Connected to Supabase and fetched records:', data.length, 'collection points found.');
    }
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

checkSupabase();
