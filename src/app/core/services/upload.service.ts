import { inject, Injectable } from '@angular/core';
import { FirebaseProvider, StorageFolders } from '@core';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  UploadMetadata
} from '@firebase/storage';
import { randomUUID } from '@utils';
import { from, Observable } from 'rxjs';

export type UploadResult = { progress: number; url: string };

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private readonly storage = inject(FirebaseProvider).storage;

  /**
   * Uploads a file to the storage
   */
  public upload(
    data: File | Blob,
    folder: StorageFolders,
    filename?: string
  ): Observable<UploadResult> {
    return new Observable<UploadResult>(subscriber => {
      try {
        const storageFilename = UploadService.getStorageFilename(
          data,
          filename
        );
        const path = `${folder}/${storageFilename}`;
        const fileRef = ref(this.storage, path);
        const uploadTask = uploadBytesResumable(
          fileRef,
          data,
          UploadService.getMetadata(data)
        );

        uploadTask.on(
          'state_changed',
          snapshot => {
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            if (progress < 100) {
              subscriber.next({ progress, url: '' });
            }
          },
          error => subscriber.error(error),
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then(url => {
              subscriber.next({ progress: 100, url });
              subscriber.complete();
            });
          }
        );
      } catch (e) {
        subscriber.error(e);
      }
    });
  }

  /**
   * Removes a file from the storage
   */
  public remove(url: string): Observable<void> {
    const fileRef = ref(this.storage, url);
    return from(deleteObject(fileRef));
  }

  private static getStorageFilename(
    data: File | Blob,
    filename?: string
  ): string | never {
    let fileExtension = '';
    let blobExtension = '';
    let proposedExtension = '';

    if (data instanceof File) {
      fileExtension = UploadService.getFileExtensionFromName(data.name);
    }

    if (data instanceof Blob && data.type) {
      // TODO implement conversion from mime type to file extension
      // npm packages are too "fat" for this tiny feature
      // blobExtension = mimeToExt(data.type);
    }

    if (filename) {
      proposedExtension = UploadService.getFileExtensionFromName(filename);
    }

    if (
      proposedExtension &&
      fileExtension &&
      proposedExtension !== fileExtension
    ) {
      throw new Error(
        `Can't use .${proposedExtension} extension for a file with .${fileExtension} extension`
      );
    }

    fileExtension = proposedExtension || fileExtension || blobExtension;
    if (!fileExtension) {
      throw new Error(`Can't determine file extension`);
    }

    return filename || `${randomUUID()}.${fileExtension}`;
  }

  private static getFileExtensionFromName(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? (parts.pop() as string) : '';
  }

  private static getMetadata(data: File | Blob): UploadMetadata {
    const metadata: UploadMetadata = {
      customMetadata: {}
    };

    if (data.type) {
      metadata.contentType = data.type;
    }

    if (data.size) {
      metadata.customMetadata!['size'] = data.size.toString();
    }

    if (data instanceof File && data.name) {
      metadata.customMetadata!['originalFilename'] = data.name;
    }

    return metadata;
  }
}
