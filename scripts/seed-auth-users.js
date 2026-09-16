const { createClient } = require('@supabase/supabase-js');

const url = 'https://hwevzebjrzdwztjpbyeu.supabase.co';
const key = 'sb_publishable_aaNck9INPmNS6aurfDTUxQ_t20XSADU';

const supabase = createClient(url, key);

async function seedAuthUsers() {
  console.log('🚀 Registering authentic Supabase Auth Demo Accounts...\n');

  const demoAccounts = [
    {
      email: 'citizen@smartwaste.com',
      password: 'SmartWaste123!',
      fullName: 'Ananya Sharma (Citizen)',
      role: 'citizen',
    },
    {
      email: 'driver@smartwaste.com',
      password: 'SmartWaste123!',
      fullName: 'Ramesh Patel (Driver)',
      role: 'driver',
    },
    {
      email: 'admin@smartwaste.com',
      password: 'SmartWaste123!',
      fullName: 'Suresh G. (Panchayat Admin)',
      role: 'admin',
    },
  ];

  for (const acc of demoAccounts) {
    console.log(`Processing: ${acc.email} (${acc.role})...`);
    
    // Attempt sign up
    const { data, error } = await supabase.auth.signUp({
      email: acc.email,
      password: acc.password,
      options: {
        data: {
          full_name: acc.fullName,
          role: acc.role,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log(`   ℹ️ Account ${acc.email} is already registered in Supabase Auth.`);
      } else {
        console.warn(`   ⚠️ Supabase Auth notice:`, error.message);
      }
    } else if (data.user) {
      console.log(`   ✅ Created Supabase Auth user (ID: ${data.user.id}).`);
    }

    // Try sign in to verify credentials
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });

    if (signInErr) {
      console.log(`   ⚠️ SignIn test note: ${signInErr.message}`);
    } else if (signInData.user) {
      console.log(`   🔑 Login verified! User ID: ${signInData.user.id}`);
      
      // Ensure role is correctly set in profiles table
      const { error: profErr } = await supabase
        .from('profiles')
        .upsert({
          id: signInData.user.id,
          full_name: acc.fullName,
          role: acc.role,
        });

      if (profErr) {
        console.warn(`   ⚠️ Profile role upsert note:`, profErr.message);
      } else {
        console.log(`   🛡️ Verified role '${acc.role}' in public.profiles table!`);
      }
    }
  }

  console.log('\n🎉 Auth seeding process finished.');
}

seedAuthUsers();
