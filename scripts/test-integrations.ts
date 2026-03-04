/**
 * Test script for ERP/CRM/HR integrations
 * Run: npx ts-node scripts/test-integrations.ts
 */

import { getOdooClient } from '../lib/odoo-service';
import { getSuiteCRMClient } from '../lib/suitecrm-service';
import { getOrangeHRMClient } from '../lib/orangehrm-service';

async function testOdoo() {
  console.log('\n🏢 Testing Odoo ERP Integration...');
  
  try {
    const odoo = getOdooClient();
    
    // Test authentication
    console.log('  ✓ Authenticating...');
    await odoo.authenticate();
    console.log('  ✓ Authentication successful');
    
    // Test getting partners
    console.log('  ✓ Fetching partners...');
    const partners = await odoo.getPartners();
    console.log(`  ✓ Found ${partners.length} partners`);
    
    // Test getting purchase orders
    console.log('  ✓ Fetching purchase orders...');
    const orders = await odoo.getPurchaseOrders();
    console.log(`  ✓ Found ${orders.length} purchase orders`);
    
    // Test getting invoices
    console.log('  ✓ Fetching invoices...');
    const invoices = await odoo.getInvoices();
    console.log(`  ✓ Found ${invoices.length} invoices`);
    
    console.log('✅ Odoo integration working!');
    return true;
  } catch (error: any) {
    console.error('❌ Odoo integration failed:', error.message);
    return false;
  }
}

async function testSuiteCRM() {
  console.log('\n👥 Testing SuiteCRM Integration...');
  
  try {
    const crm = getSuiteCRMClient();
    
    // Test authentication
    console.log('  ✓ Authenticating...');
    await crm.authenticate();
    console.log('  ✓ Authentication successful');
    
    // Test getting contacts
    console.log('  ✓ Fetching contacts...');
    const contacts = await crm.getContacts();
    console.log(`  ✓ Found ${contacts.length} contacts`);
    
    // Test getting accounts
    console.log('  ✓ Fetching accounts...');
    const accounts = await crm.getAccounts();
    console.log(`  ✓ Found ${accounts.length} accounts`);
    
    console.log('✅ SuiteCRM integration working!');
    return true;
  } catch (error: any) {
    console.error('❌ SuiteCRM integration failed:', error.message);
    return false;
  }
}

async function testOrangeHRM() {
  console.log('\n📋 Testing OrangeHRM Integration...');
  
  try {
    const hrm = getOrangeHRMClient();
    
    // Test authentication
    console.log('  ✓ Authenticating...');
    await hrm.authenticate();
    console.log('  ✓ Authentication successful');
    
    // Test getting employees
    console.log('  ✓ Fetching employees...');
    const employees = await hrm.getEmployees();
    console.log(`  ✓ Found ${employees.length} employees`);
    
    // Test getting job titles
    console.log('  ✓ Fetching job titles...');
    const jobTitles = await hrm.getJobTitles();
    console.log(`  ✓ Found ${jobTitles.length} job titles`);
    
    // Test getting departments
    console.log('  ✓ Fetching departments...');
    const departments = await hrm.getDepartments();
    console.log(`  ✓ Found ${departments.length} departments`);
    
    console.log('✅ OrangeHRM integration working!');
    return true;
  } catch (error: any) {
    console.error('❌ OrangeHRM integration failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing ERP/CRM/HR Integrations\n');
  console.log('Make sure all systems are running:');
  console.log('  - Odoo: http://localhost:8069');
  console.log('  - SuiteCRM: http://localhost:8080');
  console.log('  - OrangeHRM: http://localhost:8081');
  console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const results = {
    odoo: await testOdoo(),
    suitecrm: await testSuiteCRM(),
    orangehrm: await testOrangeHRM(),
  };
  
  console.log('\n📊 Test Results:');
  console.log(`  Odoo ERP: ${results.odoo ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  SuiteCRM: ${results.suitecrm ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  OrangeHRM: ${results.orangehrm ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = results.odoo && results.suitecrm && results.orangehrm;
  
  if (allPassed) {
    console.log('\n🎉 All integrations working!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some integrations failed. Check configuration.');
    console.log('\nTroubleshooting:');
    if (!results.odoo) {
      console.log('  - Verify Odoo is running: docker ps | grep odoo');
      console.log('  - Check ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD');
    }
    if (!results.suitecrm) {
      console.log('  - Verify SuiteCRM is running: docker ps | grep suitecrm');
      console.log('  - Check SUITECRM_URL, SUITECRM_CLIENT_ID, SUITECRM_CLIENT_SECRET');
    }
    if (!results.orangehrm) {
      console.log('  - Verify OrangeHRM is running: docker ps | grep orangehrm');
      console.log('  - Check ORANGEHRM_URL, ORANGEHRM_CLIENT_ID, ORANGEHRM_CLIENT_SECRET');
    }
    process.exit(1);
  }
}

main().catch(console.error);
