export class AzureSpeechService {
  private speechConfig: any;
  private synthesizer: any;

  constructor() {
    if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
      console.warn('Azure Speech credentials not configured');
      return;
    }

    try {
      const speechConfig = require('microsoft-cognitiveservices-speech-sdk').SpeechConfig;
      const speechSynthesizer = require('microsoft-cognitiveservices-speech-sdk').SpeechSynthesizer;
      
      this.speechConfig = speechConfig.fromSubscription(
        process.env.AZURE_SPEECH_KEY,
        process.env.AZURE_SPEECH_REGION
      );
      
      this.speechConfig.speechSynthesisVoiceName = process.env.AZURE_SPEECH_VOICE || 'en-US-JennyNeural';
    } catch (error) {
      console.error('Azure Speech SDK not available:', error);
    }
  }

  async speakText(text: string): Promise<void> {
    if (!this.speechConfig) {
      console.warn('Azure Speech not configured');
      return;
    }

    try {
      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      const synthesizer = new SpeechSynthesizer(this.speechConfig);
      
      return new Promise((resolve, reject) => {
        synthesizer.speakTextAsync(
          text,
          (result: any) => {
            if (result.reason === 0) { // SynthesizingResult.Completed
              resolve();
            } else {
              reject(new Error(`Speech synthesis failed: ${result.errorDetails}`));
            }
            synthesizer.close();
          },
          (error: any) => {
            reject(error);
            synthesizer.close();
          }
        );
      });
    } catch (error) {
      console.error('Speech synthesis error:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!this.speechConfig;
  }
}

export const azureSpeechService = new AzureSpeechService();
