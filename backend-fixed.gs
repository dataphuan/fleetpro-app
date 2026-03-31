/**
 * FIXED: Google Apps Script Backend - Version with ALL Fixes
 * 
 * Add this to your Google Apps Script deployment:
 * 1. Open: https://script.google.com/macros/s/.../edit
 * 2. Replace backend code with this
 * 3. Deploy > New Deployment > Type: Web app
 * 
 * FIXES INCLUDED:
 * ✅ Fallback contract (unknown tenant returns error)
 * ✅ authLogin POST handler
 * ✅ registerUser POST handler
 */

function doGet(e) {
  try {
    const action = e.parameter.action;
    const tenantId = e.parameter.tenant_id || e.parameter.tenant;
    
    // ========== FIX #1: Fallback Contract ==========
    // Check if tenant exists FIRST
    if (!tenantId) {
      return sendError('Missing tenant_id parameter');
    }
    
    const ss = SpreadsheetApp.openById('1SFXH7xwlMAGxjh-Y5PCglkadgxVVe5xRaEZZeewJv_o');
    const tenantsSheet = ss.getSheetByName('Tenants');
    
    if (!tenantsSheet) {
      return sendError('Tenants sheet not found');
    }
    
    const tenantRows = tenantsSheet.getDataRange().getValues();
    const tenantHeader = tenantRows[0];
    const tenantData = tenantRows.slice(1);
    
    // Find tenant
    const tenantIndex = tenantData.findIndex(row => row[0] === tenantId);
    const tenantExists = tenantIndex >= 0;
    
    // If tenant not found AND not fallback path, return error
    if (!tenantExists && action === 'tenant-config') {
      return sendError('Tenant not found', 'not-found');
    }
    
    // ========== TENANT-CONFIG HANDLER ==========
    if (action === 'tenant-config') {
      const tenant = tenantData[tenantIndex];
      
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'ok',
          tenant_id: tenantId,
          domain: tenant[2] || '',
          app_name: 'FleetPro',
          support_email: '',
          primary_color: '#2563eb',
          spreadsheet_id: ss.getId(),
          feature_flags: {},
          plan_code: 'default'
        }))
        .setMimeType(ContentType.JSON);
    }
    
    // ========== LIST HANDLER ==========
    if (action === 'list' && tenantExists) {
      const resource = e.parameter.resource;
      const resourceSheet = ss.getSheetByName(resource);
      
      if (!resourceSheet) {
        return ContentService.createTextOutput(JSON.stringify([]))
          .setMimeType(ContentType.JSON);
      }
      
      const data = resourceSheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);
      const tenantIdCol = headers.indexOf('tenant_id');
      
      const filtered = tenantIdCol >= 0 
        ? rows.filter(row => row[tenantIdCol] === tenantId)
        : rows;
      
      return ContentService.createTextOutput(JSON.stringify(filtered))
        .setMimeType(ContentType.JSON);
    }
    
    return sendError('Unknown action');
    
  } catch (err) {
    return sendError(err.message);
  }
}

// ========== FIX #2: POST Handler - authLogin ==========
// ========== FIX #3: POST Handler - registerUser ==========
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById('1SFXH7xwlMAGxjh-Y5PCglkadgxVVe5xRaEZZeewJv_o');
    
    // ========== authLogin ==========
    if (payload.type === 'authLogin') {
      const { email, api_token, tenant_id } = payload;
      
      const usersSheet = ss.getSheetByName('Users');
      if (!usersSheet) {
        return sendError('Users sheet not found');
      }
      
      const userData = usersSheet.getDataRange().getValues();
      const headers = userData[0];
      const emailCol = headers.indexOf('email');
      const tokenCol = headers.indexOf('api_token');
      const tenantCol = headers.indexOf('tenant_id');
      const roleCol = headers.indexOf('role');
      const userIdCol = headers.indexOf('user_id');
      
      // Find user
      const userRow = userData.slice(1).find(row => 
        row[emailCol] === email && 
        row[tokenCol] === api_token &&
        row[tenantCol] === tenant_id
      );
      
      if (!userRow) {
        return sendError('Invalid credentials', 'auth_failed');
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'ok',
        user_id: userRow[userIdCol],
        role: userRow[roleCol],
        token: generateToken(userRow[userIdCol], userRow[roleCol], tenant_id),
        message: 'Login successful'
      })).setMimeType(ContentType.JSON);
    }
    
    // ========== registerUser ==========
    if (payload.type === 'registerUser') {
      const { user_id, email, display_name, role, status, tenant_id } = payload;
      
      const usersSheet = ss.getSheetByName('Users');
      if (!usersSheet) {
        return sendError('Users sheet not found');
      }
      
      const userData = usersSheet.getDataRange().getValues();
      const userIdCol = userData[0].indexOf('user_id');
      
      // Check if user exists
      const exists = userData.slice(1).some(row => row[userIdCol] === user_id);
      
      if (exists) {
        return sendError('User already exists', 'duplicate_user');
      }
      
      // Add new user
      usersSheet.appendRow([
        user_id,
        email,
        '',  // api_token empty for now
        display_name,
        role,
        status,
        tenant_id,
        new Date(),
        new Date(),
        'registerUser-api'
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'ok',
        user_id: user_id,
        message: 'User registered successfully',
        token: generateToken(user_id, role, tenant_id)
      })).setMimeType(ContentType.JSON);
    }
    
    // Unknown POST type
    return sendError('Unknown POST type: ' + payload.type);
    
  } catch (err) {
    return sendError(err.message);
  }
}

// ========== HELPERS ==========
function sendError(message, fallback = null) {
  const response = {
    status: 'error',
    message: message,
    code: fallback ? 'tenant_not_found' : 'error'
  };
  
  if (fallback) {
    response.fallback = fallback;
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentType.JSON);
}

function generateToken(userId, role, tenantId) {
  // Simple token format (in production, use JWT)
  const header = Utilities.base64Encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims = Utilities.base64Encode(JSON.stringify({
    user_id: userId,
    role: role,
    tenant_id: tenantId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  }));
  
  return header + '.' + claims + '.signature';
}
