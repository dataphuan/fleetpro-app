// Google Drive API Service for FleetPro
// Handles authentication, file upload/download, and synchronization

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

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

  // Google Drive API configuration
  private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  private readonly API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
  private readonly SCOPES = 'https://www.googleapis.com/auth/drive.file';

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Load Google API script if not loaded
      if (!window.gapi) {
        await this.loadGoogleAPIScript();
      }

      // Initialize GAPI
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('client:auth2', {
          callback: resolve,
          onerror: reject,
        });
      });

      // Initialize client
      await window.gapi.client.init({
        apiKey: this.API_KEY,
        clientId: this.CLIENT_ID,
        scope: this.SCOPES,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Drive API:', error);
      return false;
    }
  }

  private loadGoogleAPIScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="apis.google.com"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.head.appendChild(script);
    });
  }

  async authenticate(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      const isSignedIn = authInstance.isSignedIn.get();

      if (!isSignedIn) {
        await authInstance.signIn();
      }

      this.isAuthenticated = true;
      this.accessToken = authInstance.currentUser.get().getAuthResponse().access_token;
      return true;
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
    if (!this.isAuthenticated) {
      return {
        success: false,
        message: 'Not authenticated',
        error: 'User must authenticate first',
      };
    }

    try {
      // Create metadata
      const metadata = {
        name: fileName,
        mimeType: mimeType,
        parents: folderId ? [folderId] : undefined,
      };

      // Create file content
      let fileContent: any;
      if (typeof content === 'string') {
        fileContent = new Blob([content], { type: mimeType });
      } else {
        fileContent = content;
      }

      // Upload file
      const response = await window.gapi.client.drive.files.create({
        resource: metadata,
        media: {
          mimeType: mimeType,
          body: fileContent,
        },
      });

      return {
        success: true,
        message: 'File uploaded successfully',
        fileId: response.result.id,
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

  async downloadFile(fileId: string): Promise<SyncResult> {
    if (!this.isAuthenticated) {
      return {
        success: false,
        message: 'Not authenticated',
        error: 'User must authenticate first',
      };
    }

    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });

      return {
        success: true,
        message: 'File downloaded successfully',
        fileId: fileId,
      };
    } catch (error: any) {
      console.error('Download failed:', error);
      return {
        success: false,
        message: 'Failed to download file',
        error: error.message,
      };
    }
  }

  async listFiles(query?: string): Promise<GoogleDriveFile[]> {
    if (!this.isAuthenticated) return [];

    try {
      const response = await window.gapi.client.drive.files.list({
        q: query || "trashed=false",
        fields: 'files(id, name, mimeType, modifiedTime, size)',
        orderBy: 'modifiedTime desc',
      });

      return response.result.files || [];
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }

  async createFolder(folderName: string, parentId?: string): Promise<SyncResult> {
    if (!this.isAuthenticated) {
      return {
        success: false,
        message: 'Not authenticated',
        error: 'User must authenticate first',
      };
    }

    try {
      const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      };

      const response = await window.gapi.client.drive.files.create({
        resource: metadata,
      });

      return {
        success: true,
        message: 'Folder created successfully',
        fileId: response.result.id,
      };
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      return {
        success: false,
        message: 'Failed to create folder',
        error: error.message,
      };
    }
  }

  async syncFleetData(data: any, tenantId: string): Promise<SyncResult> {
    const folderName = `FleetPro-${tenantId}`;
    const fileName = `fleet-data-${new Date().toISOString().split('T')[0]}.json`;

    try {
      // Create or get FleetPro folder
      const folderResult = await this.createFolder(folderName);
      if (!folderResult.success) {
        // Try to find existing folder
        const folders = await this.listFiles(`name='${folderName}' and mimeType='application/vnd.google-apps.folder'`);
        if (folders.length > 0) {
          folderResult.fileId = folders[0].id;
          folderResult.success = true;
        } else {
          return folderResult;
        }
      }

      // Upload data file
      const uploadResult = await this.uploadFile(
        fileName,
        JSON.stringify(data, null, 2),
        'application/json',
        folderResult.fileId
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