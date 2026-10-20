import { MessageResponseSchema, PhotoUploadResponseSchema } from '$shared';
import type { ApiClient } from './api-client.js';

export interface FriendPhotosApiOptions {
  client: ApiClient;
}

export class FriendPhotosApi {
  private readonly client: ApiClient;

  public constructor(options: FriendPhotosApiOptions) {
    this.client = options.client;
  }

  public uploadPhoto(friendId: string, file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    return this.client.request(PhotoUploadResponseSchema, `/api/friends/${friendId}/photo`, {
      method: 'POST',
      body: formData,
    });
  }

  public async deletePhoto(friendId: string) {
    await this.client.request(MessageResponseSchema, `/api/friends/${friendId}/photo`, {
      method: 'DELETE',
    });
  }
}
