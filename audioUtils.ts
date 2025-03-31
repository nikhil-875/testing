import fs from 'fs';
import path from 'path';
import { downloadVoiceNote } from '../util/apiHandler';

export const handleAudioMessage = async (body_param: any) => {
  try {
    // Extract the audio ID from the incoming message body
    const audioId = body_param.entry[0].changes[0].value.messages[0].audio.id;

    // Download the audio note using the audio ID
    const success = await downloadVoiceNote(audioId);
    if (success) {
      console.log('Audio downloaded successfully.');

      // Define the path where the audio was downloaded
      const downloadedAudioPath = path.resolve(__dirname, '../util/downloads', 'voice_note.ogg');
      console.log('Downloaded audio file path:', downloadedAudioPath);

      // (Optional) Delete the audio file to free up disk space
      fs.unlinkSync(downloadedAudioPath);
      console.log('Downloaded audio file deleted.');
    } else {
      console.error('Failed to download the audio.');
    }
  } catch (error) {
    console.error('Error handling audio message:', error);
  }
};
