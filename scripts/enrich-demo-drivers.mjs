#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const seedPath = path.resolve('src/data/tenantDemoSeed.ts');
let content = fs.readFileSync(seedPath, 'utf-8');

// Addresses for drivers
const addresses = [
  '123 QL1A, Ninh Hòa, Khánh Hòa',
  '456 QL1A, Cam Ranh, Khánh Hòa',
  '789 QL1A, Nha Trang, Khánh Hòa',
  '101 QL1A, Phan Rang, Ninh Thuận',
  '202 QL1A, Tuy Hòa, Phú Yên',
  '303 QL1A, Quy Nhơn, Bình Định',
  '404 QL1A, Pleiku, Gia Lai',
  '505 QL1A, Kon Tum, Kon Tum',
  '606 QL1A, Buôn Ma Thuột, Đắk Lắk',
  '707 QL1A, Gia Nghĩa, Đắk Nông',
  '808 QL1A, Đà Nẵng',
  '909 QL1A, Huế, Thừa Thiên Huế',
  '1010 QL1A, Đồng Nai',
  '1111 QL1A, TP.HCM',
  '1212 QL1A, Bình Dương',
  '1313 QL1A, Long An',
  '1414 QL1A, Bình Phước',
  '1515 QL1A, Tây Ninh',
  '1616 QL1A, Vũng Tàu',
  '1717 QL1A, Cà Mau',
  '1818 QL1A, Cần Thơ',
  '1919 QL1A, Hậu Giang',
  '2020 QL1A, Sóc Trăng',
  '2121 QL1A, Bắc Liêu',
  '2222 QL1A, Kiên Giang',
];

// Driver enrichment data (TX0009 onwards)
const enrichments = [
  { code: 'TX0009', address: addresses[8], health: '2026-09-21' },
  { code: 'TX0010', address: addresses[9], health: '2027-03-09' },
  { code: 'TX0011', address: addresses[10], health: '2027-08-26' },
  { code: 'TX0012', address: addresses[11], health: '2026-02-12' },
  { code: 'TX0013', address: addresses[12], health: '2027-08-01' },
  { code: 'TX0014', address: addresses[13], health: '2027-01-18' },
  { code: 'TX0015', address: addresses[14], health: '2027-07-07' },
  { code: 'TX0016', address: addresses[15], health: '2026-12-24' },
  { code: 'TX0017', address: addresses[16], health: '2027-06-12' },
  { code: 'TX0018', address: addresses[17], health: '2027-11-29' },
  { code: 'TX0019', address: addresses[18], health: '2027-05-17' },
  { code: 'TX0020', address: addresses[19], health: '2026-11-03' },
  { code: 'TX0021', address: addresses[20], health: '2027-04-22' },
  { code: 'TX0022', address: addresses[21], health: '2027-10-09' },
  { code: 'TX0023', address: addresses[22], health: '2027-03-14' },
  { code: 'TX0024', address: addresses[23], health: '2027-09-30' },
  { code: 'TX0025', address: addresses[24], health: '2026-12-11' },
];

// Update each driver
for (const { code, address, health } of enrichments) {
  // Find the driver entry
  const pattern = new RegExp(
    `("id": "${code}",\\s*"driver_code": "${code}",[\\s\\S]*?"license_expiry": "[^"]*",)\\s*("contract_type")`,
    'g'
  );
  
  content = content.replace(pattern, (match, before, after) => {
    // Check if already has health_check_expiry
    if (match.includes('health_check_expiry')) {
      return match;
    }
    return `${before}\n        "health_check_expiry": "${health}",\n        ${after}`;
  });
}

// Add addresses to all drivers that don't have them
content = content.replace(
  /"address": null,/g,
  (match) => {
    // This won't work for bulk - need more targeted approach
    return match;
  }
);

// Simply add address field before assigned_vehicle_id if not present
for (let i = 0; i < addresses.length; i++) {
  const vehicleId = (i % 20) + 1;
  const driverCode = i < 9 ? `TX000${i + 1}` : `TX00${i + 1}`;
  
  const pattern = new RegExp(
    `(${driverCode}[\\s\\S]*?"license_expiry": "[^"]*",\\s*)"contract_type"`,
    'g'
  );
  
  content = content.replace(pattern, (match) => {
    if (match.includes('"address"')) return match;
    return match.replace('"contract_type"', `"health_check_expiry": "${enrichments[i]?.health || '2027-04-02'}",\n        "address": "${addresses[i]}",\n        "contract_type"`);
  });
}

fs.writeFileSync(seedPath, content, 'utf-8');
console.log('✅ Demo drivers enriched with addresses and health check expiry');
