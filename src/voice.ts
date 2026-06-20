import { useCallback, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

/** On-device speech-to-text for dictating updates. Works in a prebuilt/dev build (not Expo Go). */
export function useSpeechRecognizer() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('result', (e: any) => {
    const t = e?.results?.[0]?.transcript;
    if (typeof t === 'string') setTranscript(t);
  });
  useSpeechRecognitionEvent('end', () => setRecording(false));
  useSpeechRecognitionEvent('error', (e: any) => {
    setError(e?.message || 'Speech recognition error.');
    setRecording(false);
  });

  const start = useCallback(async () => {
    setError(null);
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone / speech access is off. Enable it in iOS Settings → Scuts Tracker.');
        return;
      }
      setTranscript('');
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: true });
      setRecording(true);
    } catch (e: any) {
      setError(e?.message || 'Could not start recording.');
      setRecording(false);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      /* ignore */
    }
    setRecording(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setTranscript('');
    setError(null);
  }, [stop]);

  return { recording, transcript, error, start, stop, reset, setTranscript };
}
