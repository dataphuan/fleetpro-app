// Google Drive API Service for FleetPro
// Handles authentication, file upload/download, and synchronization using modern GIS (Google Identity Services)

declare global {
  interface Window {
    google: any;
  }
}

import { getTenantId, isProtectedSharedDemoTenant } from '@/lib/data-adapter';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  fileId?: string;
  error?: string;
}

class GoogleDriveService {
  private isInitialized = false;
  private isAuthenticated = false;
  private accessToken: string | null = null;
  private tokenClient: any = null;

  // Google Drive API configuration
  private readonly SCOPES = 'https://www.googleapis.com/auth/drive.file';

  async initialize(clientId: string): Promise<boolean> {
    if (this.isInitialized && this.tokenClient) return true;

    try {
      // 🛡️ [Demo Mode Safeguard]
      const tenantId = getTenantId();
      if (isProtectedSharedDemoTenant(tenantId)) {
        this.isInitialized = true;
        return true;
      }

      // Load Google Identity Services script
      await this.loadGISScript();

      // Initialize Token Client
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: this.SCOPES,
        callback: (response: any) => {
          if (response.error) {
            this.isAuthenticated = false;
            return;
          }
          this.accessToken = response.access_token;
          this.isAuthenticated = true;
        },
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Google GIS:', error);
      return false;
    }
  }

  private loadGISScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
      document.head.appendChild(script);
    });
  }

  async authenticate(clientId: string): Promise<boolean> {
    const initialized = await this.initialize(clientId);
    if (!initialized) return false;

    try {
      // 🛡️ [Demo Mode Safeguard]
      const tenantId = getTenantId();
      if (isProtectedSharedDemoTenant(tenantId)) {
        this.isAuthenticated = true;
        this.accessToken = 'demo-token-12345';
        return true;
      }

      return new Promise((resolve) => {
        // Wrap the callback to resolve the promise
        const originalCallback = this.tokenClient.callback;
        this.tokenClient.callback = (response: any) => {
          originalCallback(response);
          if (response.access_token) {
            resolve(true);
          } else {
            resolve(false);
          }
        };

        // Request token (shows popup)
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      });
    } catch (error) {
      console.error('Authentication failed:', error);
      this.isAuthenticated = false;
      return false;
    }
  }

  async uploadFile(
    fileName: string,
    content: string | Blob,
    mimeType: string,
    folderId?: string
  ): Promise<SyncResult> {
    if (!this.isAuthenticated || !this.accessToken) {
      return {
        success: false,
        message: 'Not authenticated',
        error: 'User must authenticate first',
      };
    }

    try {
      // 🛡️ [Demo Mode Safeguard]
      // 🛡️ [Real-world Safeguard]
      // No demo simulation here

      // Metadata for the file
      const metadata = {
        name: fileName,
        mimeType: mimeType,
        parents: folderId ? [folderId] : undefined,
      };

      // Create a multi-part body
      const formData = new FormData();
      formData.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      
      const fileBlob = typeof content === 'string' 
        ? new Blob([content], { type: mimeType }) 
        : content;
        
      formData.append('file', fileBlob);

      // Upload using REST API v3
      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const result = await response.json();

      return {
        success: true,
        message: 'File uploaded successfully',
        fileId: result.id,
      };
    } catch (error: any) {
      console.error('Upload failed:', error);
      return {
        success: false,
        message: 'Failed to upload file',
        error: error.message,
      };
    }
  }

  async createFolder(folderName: string, parentId?: string): Promise<SyncResult> {
    if (!this.isAuthenticated || !this.accessToken) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentId ? [parentId] : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create folder');
      const result = await response.json();

      return {
        success: true,
        message: 'Folder created successfully',
        fileId: result.id,
      };
    } catch (error: any) {
      return { success: false, message: 'Folder creation failed', error: error.message };
    }
  }

  async syncFleetData(data: any, tenantId: string, customFolderId?: string): Promise<SyncResult> {
    const fileName = `fleet-data-${new Date().toISOString().split('T')[0]}.json`;

    try {
      let targetFolderId = customFolderId;

      if (!targetFolderId) {
        const folderName = `FleetPro-${tenantId}`;
        const folderResult = await this.createFolder(folderName);
        if (folderResult.success) {
          targetFolderId = folderResult.fileId;
        }
      }

      // Upload data file
      const uploadResult = await this.uploadFile(
        fileName,
        JSON.stringify(data, null, 2),
        'application/json',
        targetFolderId
      );

      return uploadResult;
    } catch (error: any) {
      return {
        success: false,
        message: 'Sync failed',
        error: error.message,
      };
    }
  }

  isAuthenticatedStatus(): boolean {
    return this.isAuthenticated;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();