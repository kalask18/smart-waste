import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hwevzebjrzdwztjpbyeu.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_aaNck9INPmNS6aurfDTUxQ_t20XSADU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
