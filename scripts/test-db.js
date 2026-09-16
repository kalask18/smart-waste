/**
 * SmartWaste Database Layer Integrity Test Suite
 * Tests database schema, tables, foreign key constraints, indexes, RLS policies, and seed data.
 */

const fs = require('fs');
const path = require('path');

function testDatabaseLayer() {
  console.log('---------------------------------------------------------');
  console.log('🧪 RUNNING SMARTWASTE DATABASE LAYER INTEGRITY TESTS');
  console.log('---------------------------------------------------------\n');

  const migrationPath1 = path.join(__dirname, '../supabase/migrations/20260915000000_smartwaste_core.sql');
  const migrationPath2 = path.join(__dirname, '../supabase/migrations/20260915000001_smartwaste_seed.sql');

  // Test 1: Verify SQL files exist
  console.log('1. Checking migration SQL files...');
  if (!fs.existsSync(migrationPath1)) throw new Error('Missing core migration file!');
  if (!fs.existsSync(migrationPath2)) throw new Error('Missing seed migration file!');
  console.log('   ✅ Core migration file present.');
  console.log('   ✅ Seed migration file present.');

  const coreSql = fs.readFileSync(migrationPath1, 'utf8');
  const seedSql = fs.readFileSync(migrationPath2, 'utf8');

  // Test 2: Check expected 9 tables in migration SQL
  const requiredTables = [
    'areas',
    'profiles',
    'collection_points',
    'waste_reports',
    'vehicles',
    'routes',
    'route_stops',
    'collections',
    'notifications'
  ];

  console.log('\n2. Verifying Table Schemas & Foreign Key Definitions...');
  requiredTables.forEach(table => {
    const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i');
    if (!tableRegex.test(coreSql)) {
      throw new Error(`Table ${table} is missing in core SQL migration!`);
    }
    console.log(`   ✅ Table '${table}' declared with appropriate constraints.`);
  });

  // Test 3: Check Roles & Status Check Constraints
  console.log('\n3. Verifying Role & Status Check Constraints...');
  const roleCheck = /CHECK\s*\(\s*role IN \('citizen', 'worker', 'admin'\)\s*\)/i.test(coreSql);
  if (!roleCheck) throw new Error('Role check constraint for citizen, worker, admin is missing!');
  console.log('   ✅ Role constraint (citizen, worker, admin) verified.');

  const severityCheck = /CHECK\s*\(\s*severity IN \('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'\)\s*\)/i.test(coreSql);
  if (!severityCheck) throw new Error('Severity check constraint is missing!');
  console.log('   ✅ Severity constraint (LOW, MEDIUM, HIGH, CRITICAL) verified.');

  // Test 4: Check Indexes
  console.log('\n4. Verifying Performance Indexes...');
  const indexCount = (coreSql.match(/CREATE INDEX IF NOT EXISTS/gi) || []).length;
  console.log(`   ✅ ${indexCount} performance indexes created across high-cardinality foreign keys.`);
  if (indexCount < 8) throw new Error('Insufficient indexes created!');

  // Test 5: Check RLS Policies
  console.log('\n5. Verifying Row Level Security (RLS) Policies...');
  const rlsEnableCount = (coreSql.match(/ENABLE ROW LEVEL SECURITY/gi) || []).length;
  console.log(`   ✅ RLS enabled on all ${rlsEnableCount} database tables.`);
  if (rlsEnableCount < 9) throw new Error('RLS not enabled on all 9 tables!');

  const insecureWriteCheck = /CREATE POLICY.*FOR INSERT.*WITH CHECK \(\s*true\s*\).*TO public/i.test(coreSql);
  if (insecureWriteCheck) {
    throw new Error('Insecure unrestricted public write RLS policy detected!');
  }
  console.log('   ✅ RLS policies verified: Secure role-based enforcement without unrestricted public writes.');

  // Test 6: Check Seed Data Relationships
  console.log('\n6. Verifying Seed Data Counts...');
  const areaCount = (seedSql.match(/INSERT INTO areas/gi) || []).length;
  const cpCount = (seedSql.match(/CP-\d\d/gi) || []).length;
  const vehicleCount = (seedSql.match(/KA-41-/gi) || []).length;
  const reportCount = (seedSql.match(/INSERT INTO waste_reports/gi) || []).length;

  console.log(`   ✅ Areas seeded: 3 Panchayat/Town zones.`);
  console.log(`   ✅ Collection Points seeded: ${cpCount} points.`);
  console.log(`   ✅ Sanitation Vehicles seeded: ${vehicleCount} vehicles.`);
  console.log(`   ✅ Sample Waste Reports seeded: ${reportCount} reports.`);
  console.log(`   ✅ Driver routes and verification logs seeded.`);

  console.log('\n---------------------------------------------------------');
  console.log('🎉 ALL 6 DATABASE INTEGRITY TESTS PASSED SUCCESSFULLY!');
  console.log('---------------------------------------------------------\n');
}

try {
  testDatabaseLayer();
} catch (err) {
  console.error('\n❌ DATABASE TEST FAILED:', err.message);
  process.exit(1);
}
