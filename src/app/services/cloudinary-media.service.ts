import { Injectable } from '@angular/core';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../../environments/environment';

export interface CloudinaryAsset {
  src: string;
  resourceType: 'image' | 'video';
  width?: number;
  height?: number;
  duration?: number;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class CloudinaryMediaService {
  async upload(file: File): Promise<CloudinaryAsset> {
    const resourceType = this.resourceType(file);
    const maxBytes = resourceType === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      const limit = resourceType === 'video' ? '100 MB' : '10 MB';
      throw new Error(`${file.name} is larger than the ${limit} upload limit.`);
    }
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error('Cloudinary uploads are not configured.');
    }

    const body = new FormData();
    body.append('file', file);
    body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      { method: 'POST', body },
    );
    const result = (await response.json()) as {
      secure_url?: string;
      width?: number;
      height?: number;
      duration?: number;
      error?: { message?: string };
    };
    if (!response.ok || !result.secure_url) {
      throw new Error(result.error?.message || 'Cloudinary could not upload this file.');
    }

    return {
      src: result.secure_url,
      resourceType,
      width: result.width,
      height: result.height,
      duration: result.duration,
    };
  }

  private resourceType(file: File): 'image' | 'video' {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    throw new Error('Choose an image or video file.');
  }
}